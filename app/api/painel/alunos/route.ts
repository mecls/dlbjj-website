import type { NextRequest } from "next/server";
import { criarAlunoManual } from "@/lib/inscricao/criar";
import { validarInscricao } from "@/lib/inscricao/validar";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";

export const runtime = "nodejs";

/** Novo aluno à mão (sem token, sem lead, sem mensagem). */
export async function POST(req: NextRequest) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { um } = await campos(req);
  const r = validarInscricao(um);
  if (!r.ok) return voltar("/painel/alunos/novo", { erro: Object.values(r.erros).join("; ") });
  const inicio = /^\d{4}-\d{2}-\d{2}$/.test(um.inicio_em ?? "") ? um.inicio_em : null;
  const id = await criarAlunoManual(r.dados, inicio);
  return voltar(`/painel/alunos/${id}`, { ok: "1" });
}
