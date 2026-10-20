import type { NextRequest } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { sessaoOu401, voltar } from "@/lib/painel/guard";
import { gerarResumo } from "@/lib/painel/resumo";

export const runtime = "nodejs";

/** «Escrever resumo» / «Atualizar» na conversa: pede o resumo ao modelo e volta à conversa. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ phone: string }> }) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { phone } = await params;
  if (!/^\d{8,15}$/.test(phone)) return voltar("/painel/mensagens");
  const { data: lead } = await serviceClient().from("dlbjj_leads").select("id").eq("phone", phone).maybeSingle();
  if (!lead) return voltar("/painel/mensagens");
  const resultado = await gerarResumo(lead.id as string, phone);
  return voltar(`/painel/mensagens/${phone}`, resultado === "ok" ? { ok: "resumo" } : { erro: resultado });
}
