import type { NextRequest } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { id } = await params;
  const { um } = await campos(req);
  if (!["ativo", "inativo", "ex_aluno"].includes(um.estado ?? "")) return voltar(`/painel/alunos/${id}`, { erro: "invalido" });
  await serviceClient().from("dlbjj_alunos").update({ estado: um.estado }).eq("id", id).neq("estado", "anonimizado");
  return voltar(`/painel/alunos/${id}`, { ok: "1" });
}
