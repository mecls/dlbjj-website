import type { Db } from "../db";
import { log } from "../log";
import { hojeLisboa } from "../tempo";
import type { WhatsAppTransport } from "../transport/types";

/**
 * De minuto a minuto: o estado da sessão vai para dlbjj_sessao (uma linha), que
 * o painel /agente lê. Nunca apaga `restricao_ate`: só o backpressure a escreve.
 */
export async function heartbeat(ctx: { db: Db; transport: WhatsAppTransport; descartadas?: () => Record<string, number> }): Promise<void> {
  let estado: "ligado" | "instavel" | "caido" = "caido";
  let detalhe: string | null = null;
  let telefone: string | null = null;
  let restricao = false;
  try {
    const s = await ctx.transport.sessionState();
    estado = s.estado;
    detalhe = s.detalhe;
    telefone = s.telefone;
    restricao = s.restricao;
  } catch (e) {
    detalhe = `gateway inacessível: ${e instanceof Error ? e.message : String(e)}`;
  }
  const desc = ctx.descartadas?.() ?? {};
  const totalDesc = Object.values(desc).reduce((a, b) => a + b, 0);
  if (totalDesc > 0) {
    const resumo = `${totalDesc} entradas descartadas desde o arranque (${Object.entries(desc).map(([k, v]) => `${k}: ${v}`).join(", ")})`;
    detalhe = detalhe ? `${detalhe} · ${resumo}` : resumo;
    if (estado === "ligado") estado = "instavel";
  }
  const dia = hojeLisboa();
  const { data: orc } = await ctx.db.from("dlbjj_orcamento_envio").select("proativas,respostas,recebidas").eq("dia", dia).maybeSingle();
  const patch: Record<string, unknown> = {
    id: 1,
    estado,
    detalhe,
    telefone,
    visto_em: new Date().toISOString(),
    enviadas_hoje: (orc?.proativas ?? 0) + (orc?.respostas ?? 0),
    recebidas_hoje: orc?.recebidas ?? 0,
  };
  if (restricao) {
    const { data: atual } = await ctx.db.from("dlbjj_sessao").select("restricao_ate").eq("id", 1).maybeSingle();
    const ate = atual?.restricao_ate ? new Date(atual.restricao_ate).getTime() : 0;
    if (ate < Date.now()) patch.restricao_ate = new Date(Date.now() + 60 * 60_000).toISOString();
  }
  const { error } = await ctx.db.from("dlbjj_sessao").upsert(patch, { onConflict: "id" });
  if (error) log.error("heartbeat não escreveu dlbjj_sessao", { error });
  else log.debug("heartbeat", { estado, telefone });
}

/** Backpressure: o WhatsApp pediu para abrandar → `minutos` sem proativas. */
export async function travarProativas(db: Db, minutos: number, motivo: string): Promise<void> {
  const ate = new Date(Date.now() + minutos * 60_000).toISOString();
  const { error } = await db.from("dlbjj_sessao").upsert({ id: 1, estado: "instavel", detalhe: motivo, restricao_ate: ate }, { onConflict: "id" });
  if (error) log.error("não consegui travar as proativas", { error });
  else log.warn("proativas travadas", { minutos, motivo, ate });
}
