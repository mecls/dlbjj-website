import type { NextRequest } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";

export const runtime = "nodejs";

/** "Aparece no ranking": a checkbox vem como visivel=1 quando marcada; ausente quando não. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { id } = await params;
  const { um } = await campos(req);
  await serviceClient().from("dlbjj_alunos").update({ ranking_visivel: um.visivel === "1" }).eq("id", id);
  return voltar(`/painel/alunos/${id}`, { ok: "1" });
}
