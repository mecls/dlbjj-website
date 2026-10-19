import { createHash } from "node:crypto";
import type { Db } from "../db";
import { rememberOurSend } from "../inbound/handoff";
import { log, redigirTelefone } from "../log";
import { lerDefinicoes } from "../settings";
import { hojeLisboa } from "../tempo";
import { chatIdDe, GatewayError } from "../transport/openwa";
import type { WhatsAppTransport } from "../transport/types";
import { decidir, type Kind } from "./gates";
import { atrasoResposta, intervaloProativa, tempoDeEscrita } from "./timing";

/**
 * O ÚNICO consumidor da fila de saída (spec §6.1). Reclama linhas com um lease,
 * passa cada uma pelas portas (gates.ts) NO MOMENTO DE SAIR, humaniza
 * (lido → pausa → a escrever → enviar) e fecha o resultado.
 *
 * Um envio que expirou fica `desconhecido` e nunca é repetido (§6.6): pode ter
 * chegado, e repeti-lo era uma mensagem duplicada a uma pessoa real. Só
 * 429/5xx/rede-antes-de-resposta voltam à fila, com [30 s, 5 min, 30 min].
 */
export const BACKOFF_MS = [30_000, 5 * 60_000, 30 * 60_000] as const;
export const MAX_TENTATIVAS = 4;

export interface DrainerDeps {
  db: Db;
  transport: WhatsAppTransport;
  config: { workerId: string; humanizar: boolean; leaseTtlMs: number };
  /** Injetável para os testes fixarem o relógio. */
  agora?: () => Date;
}

export interface Resultado {
  reclamadas: number;
  enviadas: number;
  canceladas: number;
  adiadas: number;
  falhadas: number;
  desconhecidas: number;
  reenfileiradas: number;
}

interface Linha {
  id: string;
  phone: string;
  kind: Kind;
  corpo: string;
  tentativas: number;
  regra: string | null;
}

const dormir = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());
const hash = (phone: string) => createHash("sha256").update(phone).digest("hex");

let emCurso = 0;
/** Quantas linhas estão a meio de um envio neste processo (para o shutdown). */
export function drainInFlight(): number {
  return emCurso;
}

export async function drainOnce(deps: DrainerDeps): Promise<Resultado> {
  const agora = deps.agora?.() ?? new Date();
  const r: Resultado = { reclamadas: 0, enviadas: 0, canceladas: 0, adiadas: 0, falhadas: 0, desconhecidas: 0, reenfileiradas: 0 };
  const { db, transport } = deps;

  const { data: linhas, error } = await db.rpc("dlbjj_reclamar_fila", {
    p_worker: deps.config.workerId,
    p_agora: agora.toISOString(),
    p_ttl: `${Math.round(deps.config.leaseTtlMs / 1000)} seconds`,
  });
  if (error) {
    log.error("reclamar fila falhou", { error });
    return r;
  }
  const rows = (linhas ?? []) as Linha[];
  r.reclamadas = rows.length;
  if (rows.length === 0) return r;

  const defs = await lerDefinicoes(db);
  const dia = hojeLisboa(agora);
  const [{ data: orc }, { data: sessao }] = await Promise.all([
    db.from("dlbjj_orcamento_envio").select("proativas").eq("dia", dia).maybeSingle(),
    db.from("dlbjj_sessao").select("restricao_ate").eq("id", 1).maybeSingle(),
  ]);
  let proativasHoje = orc?.proativas ?? 0;
  const restricaoAte = sessao?.restricao_ate ? new Date(sessao.restricao_ate) : null;
  let proativasNesteTick = 0;

  for (const row of rows) {
    let optOut = false;
    if (row.kind === "proativa") {
      const { data } = await db.from("dlbjj_opt_outs").select("phone_hash").eq("phone_hash", hash(row.phone)).maybeSingle();
      optOut = Boolean(data);
    }
    const decisao = decidir(row, {
      agora,
      botLigado: defs.botLigado,
      optOut,
      janela: { inicio: defs.janelaInicio, fim: defs.janelaFim },
      proativasHoje,
      tecto: defs.proativasPorDia,
      restricaoAte,
    });

    if (decisao.acao === "cancelar") {
      await db.rpc("dlbjj_terminar_fila", { p_id: row.id, p_estado: "cancelada", p_erro: decisao.motivo });
      r.canceladas += 1;
      continue;
    }
    if (decisao.acao === "adiar") {
      await db
        .from("dlbjj_fila_saida")
        .update({ estado: "pendente", enviar_apos: decisao.ate.toISOString(), locked_by: null, locked_at: null, erro: decisao.motivo })
        .eq("id", row.id);
      r.adiadas += 1;
      continue;
    }

    // ── enviar ──
    const chat = chatIdDe(row.phone);
    const humanizar = deps.config.humanizar;
    emCurso += 1;
    try {
      if (row.kind === "proativa" && proativasNesteTick > 0) {
        await dormir(intervaloProativa(defs.proativaIntervaloMedioS, defs.proativaIntervaloDesvioS, humanizar));
      }
      if (row.kind !== "proativa") {
        await transport.markRead(chat);
        await dormir(atrasoResposta(defs.respostaAtrasoMediaS, defs.respostaAtrasoDesvioS, humanizar));
      }
      await transport.setTyping(chat, "typing");
      await dormir(tempoDeEscrita(row.corpo, defs.digitarWpm, humanizar));
      await transport.setTyping(chat, "paused");

      await db.from("dlbjj_fila_saida").update({ envio_iniciado_em: new Date().toISOString() }).eq("id", row.id);
      let enviado;
      try {
        enviado = await transport.sendText(chat, row.corpo);
      } catch (e) {
        await tratarFalha(deps, row, e, agora, r);
        continue;
      }
      rememberOurSend(enviado.id); // SÍNCRONO, antes de qualquer await: fecha a corrida com o eco
      await db.rpc("dlbjj_terminar_fila", { p_id: row.id, p_estado: "enviada", p_wa_message_id: enviado.id });
      await db.rpc("dlbjj_incrementar_orcamento", { p_dia: dia, p_campo: row.kind === "proativa" ? "proativas" : "respostas" });
      if (row.kind === "proativa") {
        proativasHoje += 1;
        proativasNesteTick += 1;
        await db.from("dlbjj_toques").update({ estado: "enviada", enviada_em: new Date().toISOString() }).eq("fila_id", row.id);
      }
      r.enviadas += 1;
      log.info("enviada", { phone: redigirTelefone(row.phone), kind: row.kind, id: enviado.id });
    } finally {
      emCurso -= 1;
    }
  }
  return r;
}

async function tratarFalha(deps: DrainerDeps, row: Linha, e: unknown, agora: Date, r: Resultado): Promise<void> {
  const { db } = deps;
  const erro = e instanceof Error ? e.message : String(e);
  if (e instanceof GatewayError && e.timedOut) {
    await db.rpc("dlbjj_terminar_fila", { p_id: row.id, p_estado: "desconhecido", p_erro: `expirou sem resposta: ${erro}` });
    r.desconhecidas += 1;
    log.error("envio expirou — marcado desconhecido, NÃO repetido", { phone: redigirTelefone(row.phone), id: row.id });
    return;
  }
  const retryable = e instanceof GatewayError ? e.retryable : false;
  if (retryable && row.tentativas + 1 < MAX_TENTATIVAS) {
    const espera = BACKOFF_MS[Math.min(row.tentativas, BACKOFF_MS.length - 1)];
    await db.rpc("dlbjj_terminar_fila", {
      p_id: row.id,
      p_estado: "pendente",
      p_erro: erro,
      p_enviar_apos: new Date(agora.getTime() + espera).toISOString(),
    });
    await db.from("dlbjj_fila_saida").update({ envio_iniciado_em: null }).eq("id", row.id);
    r.reenfileiradas += 1;
    log.warn("envio falhou; volta à fila", { phone: redigirTelefone(row.phone), tentativa: row.tentativas + 1, espera, erro });
    return;
  }
  await db.rpc("dlbjj_terminar_fila", { p_id: row.id, p_estado: "falhou", p_erro: erro });
  r.falhadas += 1;
  log.error("envio falhou definitivamente", { phone: redigirTelefone(row.phone), id: row.id, erro });
}

/** No arranque: o que estava a meio de um envio quando o processo morreu fica desconhecido. */
export async function reconciliarInterrompidas(deps: DrainerDeps): Promise<number> {
  const { data } = await deps.db
    .from("dlbjj_fila_saida")
    .update({ estado: "desconhecido", erro: "worker reiniciou a meio do envio", locked_by: null, locked_at: null })
    .eq("estado", "a_enviar")
    .not("envio_iniciado_em", "is", null)
    .select("id");
  const n = data?.length ?? 0;
  if (n > 0) log.warn("envios interrompidos fechados como desconhecidos", { n });
  return n;
}

/** Ao parar: devolve à fila o que este worker reclamou e ainda não começou a enviar. */
export async function libertarTudo(deps: DrainerDeps): Promise<number> {
  const { data, error } = await deps.db.rpc("dlbjj_libertar_fila", { p_worker: deps.config.workerId });
  if (error) {
    log.warn("libertar fila falhou", { error });
    return 0;
  }
  return (data as number) ?? 0;
}
