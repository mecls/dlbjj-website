import type { NextRequest } from "next/server";
import { anonimizarAluno } from "@/lib/anonimizar";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { id } = await params;
  const { um } = await campos(req);
  if (um.confirmacao !== "ANONIMIZAR") return voltar(`/painel/alunos/${id}`, { erro: "confirmacao" });
  await anonimizarAluno(id);
  return voltar(`/painel/alunos/${id}`, { ok: "1" });
}
