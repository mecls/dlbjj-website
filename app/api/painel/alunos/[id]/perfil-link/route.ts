import type { NextRequest } from "next/server";
import { APP } from "@/lib/config";
import { alunoPublicoPorId, primeiroNome } from "@/lib/alunos/consultas";
import { sendOutbound } from "@/lib/bot/outbound";
import { sessaoOu401, voltar } from "@/lib/painel/guard";
import { emitirToken } from "@/lib/tokens-db";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { id } = await params;
  const aluno = await alunoPublicoPorId(id);
  if (!aluno || aluno.estado === "anonimizado") return voltar(`/painel/alunos/${id}`, { erro: "invalido" });
  const token = await emitirToken("perfil", { alunoId: id });
  await sendOutbound({
    leadId: null,
    alunoId: id,
    to: aluno.phone,
    role: "bot",
    kind: "sistema",
    body: `Aqui tens a tua ficha, ${primeiroNome(aluno.nome)}: ${APP.baseUrl()}/aluno/${token} (válido 7 dias)`,
  });
  return voltar(`/painel/alunos/${id}`, { ok: "1" });
}
