"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { serviceClient } from "@/lib/supabase/service";
import { sendOutbound } from "@/lib/bot/outbound";
import { assertAuthed, loginWith, logout } from "@/lib/auth";
import type { Lead, LeadStatus } from "@/lib/bot/types";

const LEADS = "dlbjj_leads";

async function leadByPhone(phone: string): Promise<Lead | null> {
  const db = serviceClient();
  const { data } = await db
    .from(LEADS)
    .select("*")
    .eq("phone", phone)
    .maybeSingle();
  return (data as Lead) ?? null;
}

function refresh(phone: string) {
  revalidatePath(`/painel/${phone}`);
  revalidatePath("/painel");
}

// ─── Auth ───

export async function loginAction(formData: FormData) {
  const ok = await loginWith(String(formData.get("password") ?? ""));
  redirect(ok ? "/painel" : "/painel/login?erro=1");
}

export async function logoutAction() {
  await logout();
  redirect("/painel/login");
}

// ─── Ações sobre a lead ───

/** Resposta manual do Daniel — assume a conversa (pausa o bot) e envia. */
export async function operatorReply(phone: string, body: string) {
  await assertAuthed();
  const text = body.trim();
  if (!text) return;
  const lead = await leadByPhone(phone);
  if (lead) {
    const db = serviceClient();
    await db
      .from(LEADS)
      .update({
        paused: true,
        status: "humano",
        human_reason: "Resposta manual no painel",
      })
      .eq("id", lead.id);
  }
  await sendOutbound({
    leadId: lead?.id ?? null,
    to: phone,
    role: "humano",
    body: text,
  });
  refresh(phone);
}

export async function pauseLead(phone: string) {
  await assertAuthed();
  const db = serviceClient();
  await db
    .from(LEADS)
    .update({
      paused: true,
      status: "humano",
      human_reason: "Pausado no painel",
    })
    .eq("phone", phone);
  refresh(phone);
}

export async function resumeLead(phone: string) {
  await assertAuthed();
  const db = serviceClient();
  await db
    .from(LEADS)
    .update({ paused: false, status: "em_progresso", human_reason: null, humano_ate: null })
    .eq("phone", phone);
  refresh(phone);
}

export async function setLeadStatus(phone: string, status: LeadStatus) {
  await assertAuthed();
  const db = serviceClient();
  const patch: Partial<Lead> = { status };
  if (status === "concluido") patch.step = "concluido";
  await db.from(LEADS).update(patch).eq("phone", phone);
  refresh(phone);
}
