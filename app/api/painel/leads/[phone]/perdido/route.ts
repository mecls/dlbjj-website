import type { NextRequest } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { sessaoOu401, voltar } from "@/lib/painel/guard";

export const runtime = "nodejs";

/** "Marcar como perdido": a lead deixa de ser alvo da reativação até voltar a escrever. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ phone: string }> }) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { phone } = await params;
  if (!/^\d{8,15}$/.test(phone)) return voltar("/painel/mensagens");
  await serviceClient().from("dlbjj_leads").update({ status: "perdido" }).eq("phone", phone).not("status", "in", "(inscrito)");
  return voltar(`/painel/mensagens/${phone}`);
}
