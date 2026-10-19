import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import type { Lead, Step } from "./types";

const LEADS = "dlbjj_leads";

/** Interruptor global do bot (dlbjj_settings.bot_enabled). */
export async function botEnabled(): Promise<boolean> {
  const db = serviceClient();
  const { data } = await db
    .from("dlbjj_settings")
    .select("value")
    .eq("key", "bot_enabled")
    .maybeSingle();
  return data?.value !== "off"; // default: ligado
}

/**
 * Vai buscar a lead pelo número, criando-a (ficha nova) se ainda não existir.
 *
 * Duas mensagens que cheguem ao mesmo tempo do mesmo número correm isto duas
 * vezes em paralelo: as duas não encontram nada, as duas tentam inserir, e o
 * `unique` no `phone` faz a segunda falhar. Antes, essa falha devolvia `null` e
 * rebentava mais à frente em `lead.id`; agora vai buscar a linha que a outra
 * acabou de criar, que é o que se queria desde o início.
 */
export async function getOrCreateLead(
  phone: string,
  name?: string | null,
): Promise<Lead> {
  const db = serviceClient();
  const { data: existing } = await db
    .from(LEADS)
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    const lead = existing as Lead;
    // Preenche o nome do perfil do WhatsApp se ainda não tínhamos.
    if (!lead.name && name?.trim()) {
      return updateLead(lead.id, { name: name.trim() });
    }
    return lead;
  }

  const { data, error } = await db
    .from(LEADS)
    .insert({ phone, name: name?.trim() || null, step: "inicio", status: "novo" })
    .select()
    .single();

  if (error) {
    // 23505 = unique_violation: outra mensagem criou a lead entretanto.
    if (error.code === "23505") {
      const { data: raced } = await db
        .from(LEADS)
        .select("*")
        .eq("phone", phone)
        .maybeSingle();
      if (raced) return raced as Lead;
    }
    throw new Error(`getOrCreateLead(${phone}) falhou: ${error.message}`);
  }
  if (!data) throw new Error(`getOrCreateLead(${phone}) não devolveu linha`);
  return data as Lead;
}

/** Atualiza campos da lead e devolve a linha fresca. */
export async function updateLead(
  id: string,
  patch: Partial<Lead>,
): Promise<Lead> {
  const db = serviceClient();
  const { data, error } = await db
    .from(LEADS)
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  // Sem isto, um update falhado devolvia `undefined` disfarçado de Lead e a
  // conversa morria uns passos à frente, longe da causa.
  if (error) throw new Error(`updateLead(${id}) falhou: ${error.message}`);
  if (!data) throw new Error(`updateLead(${id}) não encontrou a lead`);
  return data as Lead;
}

export async function setStep(id: string, step: Step): Promise<void> {
  const db = serviceClient();
  await db.from(LEADS).update({ step }).eq("id", id);
}

export async function touchLead(id: string): Promise<void> {
  const db = serviceClient();
  await db
    .from(LEADS)
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", id);
}

/** Pausa o bot nesta lead — um humano (Daniel) assume a conversa. */
export async function pauseForHuman(id: string, reason: string): Promise<void> {
  await updateLead(id, {
    paused: true,
    status: "humano",
    human_reason: reason,
  });
}

export async function resumeLead(id: string): Promise<Lead> {
  return updateLead(id, {
    paused: false,
    status: "em_progresso",
    human_reason: null,
    humano_ate: null,
  });
}
