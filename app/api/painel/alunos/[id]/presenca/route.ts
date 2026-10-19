import type { NextRequest } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { id } = await params;
  const { um } = await campos(req);
  if (!um.turma_id || !/^\d{4}-\d{2}-\d{2}$/.test(um.data ?? "")) return voltar(`/painel/alunos/${id}`, { erro: "invalido" });
  const db = serviceClient();
  const { error } = await db.from("dlbjj_presencas").insert({ aluno_id: id, turma_id: um.turma_id, data: um.data, origem: "painel" });
  if (error) return voltar(`/painel/alunos/${id}`, { erro: error.code === "23505" ? "duplicada" : error.message });
  await db.from("dlbjj_alunos").update({ estado: "ativo" }).eq("id", id).eq("estado", "inativo");
  return voltar(`/painel/alunos/${id}`, { ok: "1" });
}
