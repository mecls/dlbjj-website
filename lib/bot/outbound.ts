import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import type { OutboundOption } from "./options";
import { renderOptions } from "./render";
import { dividirCorpo } from "./dividir";
import type { MessageRole } from "./types";

const MSGS = "dlbjj_mensagens";
const LEADS = "dlbjj_leads";
const FILA = "dlbjj_fila_saida";

/**
 * Regista uma mensagem recebida. `created = false` quando já existia (mesmo
 * wa_message_id) — é a GUARDA de idempotência: o gateway reentrega webhooks,
 * e assim o motor só processa cada mensagem uma vez. Devolve o id da linha
 * para a poder apagar se o tratamento falhar (ver retrocesso.ts).
 */
export async function logInbound(params: {
  leadId: string | null;
  phone: string;
  role: MessageRole;
  body: string;
  mediaUrl?: string | null;
  waMessageId?: string | null;
}): Promise<{ created: boolean; id: string | null }> {
  const db = serviceClient();
  const { data, error } = await db
    .from(MSGS)
    .insert({
      lead_id: params.leadId,
      phone: params.phone,
      direction: "in",
      role: params.role,
      body: params.body,
      media_url: params.mediaUrl ?? null,
      wa_message_id: params.waMessageId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation no wa_message_id → webhook duplicado, ignorar.
    if (error.code === "23505") return { created: false, id: null };
    console.error("[outbound] logInbound failed", error);
    return { created: true, id: null }; // erro não-duplicado: seguimos em frente mesmo assim
  }

  if (params.leadId) {
    await db
      .from(LEADS)
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", params.leadId);
  }
  return { created: true, id: data?.id ?? null };
}

export type OutboundKind = "resposta" | "sistema" | "proativa" | "humano";

export interface SendOptions {
  leadId: string | null;
  alunoId?: string | null;
  to: string;
  role: MessageRole; // 'bot' ou 'humano'
  body: string;
  options?: OutboundOption[];
  /** Por omissão: `humano` quando role é humano, senão `resposta`. */
  kind?: OutboundKind;
  /** Regra de reativação (R1…R5) quando kind é `proativa`. */
  regra?: string;
  /** Não enviar antes de… (reativação espalha os envios). */
  enviarApos?: Date;
}

/**
 * A ÚNICA forma de a app dizer alguma coisa a alguém (spec §6.1): regista a
 * mensagem no log e põe-na na fila de saída. Quem envia é o worker. Devolve os
 * ids da mensagem e da linha da fila.
 */
export async function sendOutbound(opts: SendOptions): Promise<{ mensagemId: string | null; filaId: string | null }> {
  const partes = dividirCorpo(renderOptions(opts.body, opts.options ?? []));
  if (partes.length === 1) return enfileirar(opts, partes[0], opts.enviarApos);
  // Mais de 900 caracteres: uma linha por parte, 3 s entre elas para a ordem se manter.
  const base = opts.enviarApos ?? new Date();
  let primeiro: { mensagemId: string | null; filaId: string | null } | null = null;
  for (const [i, parte] of partes.entries()) {
    const r = await enfileirar(opts, parte, new Date(base.getTime() + i * 3_000));
    primeiro ??= r;
  }
  return primeiro!;
}

async function enfileirar(opts: SendOptions, corpo: string, enviarApos: Date | undefined): Promise<{ mensagemId: string | null; filaId: string | null }> {
  const db = serviceClient();
  const kind: OutboundKind = opts.kind ?? (opts.role === "humano" ? "humano" : "resposta");

  const { data: msg, error: e1 } = await db
    .from(MSGS)
    .insert({
      lead_id: opts.leadId,
      phone: opts.to,
      direction: "out",
      role: opts.role,
      body: corpo,
      estado: "na_fila",
    })
    .select("id")
    .single();
  if (e1) console.error("[outbound] mensagem não registada", e1);

  const { data: fila, error: e2 } = await db
    .from(FILA)
    .insert({
      phone: opts.to,
      lead_id: opts.leadId,
      aluno_id: opts.alunoId ?? null,
      kind,
      regra: opts.regra ?? null,
      corpo,
      mensagem_id: msg?.id ?? null,
      ...(enviarApos ? { enviar_apos: enviarApos.toISOString() } : {}),
    })
    .select("id")
    .single();
  if (e2) {
    console.error("[outbound] fila não escrita", e2);
    throw new Error(`sendOutbound: fila não escrita: ${e2.message}`);
  }

  if (msg?.id && fila?.id) {
    await db.from(MSGS).update({ fila_id: fila.id }).eq("id", msg.id);
  }
  if (opts.leadId) {
    await db
      .from(LEADS)
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", opts.leadId);
  }
  return { mensagemId: msg?.id ?? null, filaId: fila?.id ?? null };
}
