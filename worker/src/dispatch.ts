import { applyHandoff, isRecentlyOurs } from "./inbound/handoff";
import { encaminhar, type ForwardCtx } from "./inbound/forward";
import { normalizarEntrada } from "./inbound/normalize";
import { log, redigirTelefone } from "./log";
import { heartbeat, travarProativas } from "./scheduler/heartbeat";
import { hojeLisboa } from "./tempo";
import type { WhatsAppTransport } from "./transport/types";

/**
 * Um evento do gateway → o que fazer com ele. Só aqui se decide isso.
 *
 *  message.received → normalizar, contar, encaminhar para a app
 *  message.sent     → eco nosso? ignorar : passagem de mão
 *  message.ack      → entregue / lida na mensagem
 *  message.failed   → 3 em 10 min → 15 min sem proativas
 *  session.restriction → 60 min sem proativas
 *  session.*        → refrescar dlbjj_sessao
 */
export interface DispatchCtx extends ForwardCtx {
  transport: WhatsAppTransport;
  pausaHoras: number;
}

const FALHAS_JANELA_MS = 10 * 60_000;

export interface Dispatcher {
  (event: string, data: unknown): Promise<void>;
  /** Entradas que o worker não percebeu, por motivo — a deriva do gateway vê-se aqui. */
  descartadas(): Record<string, number>;
}

export function criarDispatcher(ctx: DispatchCtx): Dispatcher {
  const falhas: number[] = [];
  const descartadas: Record<string, number> = {};
  const { db } = ctx;

  const dispatcher = (async (event: string, data: unknown) => {
    switch (event) {
      case "message.received": {
        const e = normalizarEntrada(data);
        if (e.kind === "descartar") {
          // "grupo" e "estado" são normais; o resto é deriva do payload ou @lid por resolver —
          // a warn, e contado, porque o sintoma de o gateway mudar é o silêncio.
          if (e.motivo === "grupo" || e.motivo === "estado") {
            log.debug("mensagem descartada", { motivo: e.motivo });
          } else {
            descartadas[e.motivo] = (descartadas[e.motivo] ?? 0) + 1;
            log.warn("entrada descartada", { motivo: e.motivo, total: descartadas[e.motivo] });
          }
          return;
        }
        if (e.kind === "eco") return; // raro em message.received; tratado em message.sent
        if (isRecentlyOurs(e.id)) {
          // Guarda contra ciclos: se o `fromMe` desaparecer num payload, uma resposta nossa
          // voltaria a entrar na app como mensagem da pessoa.
          log.warn("message.received com o id de um envio nosso; ignorado", { id: e.id });
          return;
        }
        await db.rpc("dlbjj_incrementar_orcamento", { p_dia: hojeLisboa(), p_campo: "recebidas" });
        await encaminhar(ctx, { phone: e.phone, text: e.text, id: e.id, name: e.name }, e.id);
        return;
      }
      case "message.sent": {
        const e = normalizarEntrada(data);
        if (e.kind === "eco") {
          await applyHandoff(db, e, ctx.pausaHoras);
          return;
        }
        if (e.kind === "mensagem") {
          // fromMe em falta no payload: trata como eco na mesma (é message.sent).
          await applyHandoff(db, { id: e.id, phone: e.phone, chatId: e.chatId, text: e.text }, ctx.pausaHoras);
        }
        return;
      }
      case "message.ack": {
        const d = (data ?? {}) as { messageId?: string; id?: string; ack?: number };
        const id = d.messageId ?? d.id;
        if (!id || typeof d.ack !== "number") return;
        const patch = d.ack >= 3 ? { lido_em: new Date().toISOString(), estado: "lida" } : d.ack === 2 ? { entregue_em: new Date().toISOString(), estado: "entregue" } : null;
        if (patch) await db.from("dlbjj_mensagens").update(patch).eq("wa_message_id", id).in("estado", ["enviada", "entregue"]);
        return;
      }
      case "message.failed": {
        const agora = Date.now();
        falhas.push(agora);
        while (falhas.length && falhas[0] < agora - FALHAS_JANELA_MS) falhas.shift();
        const d = (data ?? {}) as { messageId?: string; id?: string };
        log.warn("mensagem falhou no WhatsApp", { id: d.messageId ?? d.id, falhasRecentes: falhas.length });
        if (falhas.length >= 3) {
          await travarProativas(db, 15, "3 falhas de envio em 10 minutos");
          falhas.length = 0;
        }
        return;
      }
      case "session.restriction": {
        const d = (data ?? {}) as { kind?: string; message?: string };
        await travarProativas(db, 60, `Restrição do WhatsApp: ${d.message ?? d.kind ?? "conta limitada"}`);
        return;
      }
      case "session.status":
      case "session.qr":
      case "session.authenticated":
      case "session.disconnected":
      case "session.reconnect_loop": {
        log.warn("evento de sessão", { event, data: typeof data === "object" ? data : String(data) });
        await heartbeat(ctx);
        return;
      }
      case "call.received":
      case "call.missed": {
        const d = (data ?? {}) as { from?: string };
        log.info("chamada", { event, from: redigirTelefone(d.from) });
        return;
      }
      default:
        log.debug("evento ignorado", { event });
    }
  }) as Dispatcher;
  dispatcher.descartadas = () => ({ ...descartadas });
  return dispatcher;
}
