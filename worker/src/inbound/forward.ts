import type { Db } from "../db";
import { log, redigirTelefone } from "../log";

/**
 * Worker → app: POST /api/agent/inbound com `x-dlbjj-token`. Se a app não
 * aceitar (rede, 5xx, timeout), a entrega vai para dlbjj_entradas_falhadas e
 * é retomada com [30 s, 5 min, 30 min]; à 4.ª falha fica sinalizada no painel
 * e não volta a ser tentada (spec §3 H, §14).
 */
export const BACKOFF_ENTRADAS_MS = [30_000, 5 * 60_000, 30 * 60_000] as const;
export const MAX_TENTATIVAS_ENTRADA = 3;

export interface ForwardCtx {
  db: Db;
  appBaseUrl: string;
  token: string;
  timeoutMs: number;
}

export interface MensagemParaApp {
  phone: string;
  text: string;
  id: string;
  name?: string;
}

function corpo(m: MensagemParaApp) {
  return { from: m.phone, text: m.text, waMessageId: m.id, ...(m.name ? { name: m.name } : {}) };
}

async function post(ctx: ForwardCtx, m: MensagemParaApp): Promise<{ ok: true } | { ok: false; erro: string }> {
  try {
    const r = await fetch(`${ctx.appBaseUrl.replace(/\/+$/, "")}/api/agent/inbound`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-dlbjj-token": ctx.token },
      body: JSON.stringify(corpo(m)),
      signal: AbortSignal.timeout(ctx.timeoutMs),
    });
    if (r.ok) return { ok: true };
    return { ok: false, erro: `app respondeu ${r.status}: ${(await r.text()).slice(0, 200)}` };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}

export async function encaminhar(ctx: ForwardCtx, m: MensagemParaApp, deliveryId: string): Promise<"ok" | "falhou"> {
  const r = await post(ctx, m);
  if (r.ok) return "ok";
  log.warn("app não aceitou a mensagem; vai para carta morta", { phone: redigirTelefone(m.phone), erro: r.erro });
  await ctx.db.from("dlbjj_entradas_falhadas").upsert(
    {
      delivery_id: deliveryId,
      payload: corpo(m),
      tentativas: 1,
      proxima_em: new Date(Date.now() + BACKOFF_ENTRADAS_MS[0]).toISOString(),
      erro: r.erro,
    },
    { onConflict: "delivery_id", ignoreDuplicates: true },
  );
  return "falhou";
}

/** Tenta de novo as cartas mortas cuja hora chegou. */
export async function retomarFalhadas(ctx: ForwardCtx): Promise<{ tentadas: number; resolvidas: number }> {
  const { data } = await ctx.db
    .from("dlbjj_entradas_falhadas")
    .select("id,delivery_id,payload,tentativas")
    .is("resolvida_em", null)
    .lte("tentativas", MAX_TENTATIVAS_ENTRADA)
    .lte("proxima_em", new Date().toISOString())
    .order("proxima_em")
    .limit(20);
  let tentadas = 0;
  let resolvidas = 0;
  for (const row of data ?? []) {
    const p = row.payload as { from: string; text: string; waMessageId: string; name?: string };
    tentadas += 1;
    const r = await post(ctx, { phone: p.from, text: p.text, id: p.waMessageId, name: p.name });
    if (r.ok) {
      resolvidas += 1;
      await ctx.db.from("dlbjj_entradas_falhadas").update({ resolvida_em: new Date().toISOString(), erro: null }).eq("id", row.id);
      continue;
    }
    const tentativas = row.tentativas + 1;
    const espera = BACKOFF_ENTRADAS_MS[Math.min(tentativas - 1, BACKOFF_ENTRADAS_MS.length - 1)];
    await ctx.db
      .from("dlbjj_entradas_falhadas")
      .update({ tentativas, proxima_em: new Date(Date.now() + espera).toISOString(), erro: r.erro })
      .eq("id", row.id);
    if (tentativas > MAX_TENTATIVAS_ENTRADA) log.error("carta morta sinalizada: a app não aceitou 4 vezes", { delivery: row.delivery_id, erro: r.erro });
  }
  return { tentadas, resolvidas };
}
