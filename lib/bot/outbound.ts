import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import { getProvider, type OutboundOption } from "@/lib/messaging/provider";
import type { MessageRole } from "./types";

const MSGS = "dlbjj_mensagens";
const LEADS = "dlbjj_leads";

/**
 * Regista uma mensagem recebida. Devolve `true` se foi mesmo inserida, `false`
 * se já existia (mesmo wa_message_id) — é a GUARDA de idempotência: a Meta
 * reentrega webhooks, e assim o motor só processa cada mensagem uma vez.
 */
export async function logInbound(params: {
  leadId: string | null;
  phone: string;
  role: MessageRole;
  body: string;
  mediaUrl?: string | null;
  waMessageId?: string | null;
}): Promise<boolean> {
  const db = serviceClient();
  const { error } = await db.from(MSGS).insert({
    lead_id: params.leadId,
    phone: params.phone,
    direction: "in",
    role: params.role,
    body: params.body,
    media_url: params.mediaUrl ?? null,
    wa_message_id: params.waMessageId ?? null,
  });

  if (error) {
    // 23505 = unique_violation no wa_message_id → webhook duplicado, ignorar.
    if (error.code === "23505") return false;
    console.error("[outbound] logInbound failed", error);
    return true; // erro não-duplicado: seguimos em frente mesmo assim
  }

  if (params.leadId) {
    await db
      .from(LEADS)
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", params.leadId);
  }
  return true;
}

interface SendOptions {
  leadId: string | null;
  to: string;
  role: MessageRole; // 'bot' ou 'humano'
  body: string;
  options?: OutboundOption[];
  listLabel?: string;
}

/** Regista uma mensagem de saída no log e entrega-a pelo transporte ativo. */
export async function sendOutbound(opts: SendOptions): Promise<void> {
  const db = serviceClient();
  const { data: msg } = await db
    .from(MSGS)
    .insert({
      lead_id: opts.leadId,
      phone: opts.to,
      direction: "out",
      role: opts.role,
      body: opts.body,
    })
    .select("id")
    .single();

  await deliver(opts.to, opts.body, opts.options, opts.listLabel, msg?.id);

  if (opts.leadId) {
    await db
      .from(LEADS)
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", opts.leadId);
  }
}

/** Entrega uma mensagem já registada (texto / botões ≤3 / lista >3). */
export async function deliver(
  to: string,
  body: string,
  options: OutboundOption[] | undefined,
  listLabel: string | undefined,
  messageId?: string,
): Promise<void> {
  const db = serviceClient();
  const provider = getProvider();
  let waId: string | null = null;

  if (options && options.length > 0) {
    waId =
      options.length <= 3
        ? await provider.sendButtons(to, body, options)
        : await provider.sendList(to, body, listLabel ?? "Escolher", options);
  } else {
    waId = await provider.sendText(to, body);
  }

  if (waId && messageId) {
    await db.from(MSGS).update({ wa_message_id: waId }).eq("id", messageId);
  }
}
