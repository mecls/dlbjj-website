import type { NextRequest } from "next/server";
import { mesValido } from "@/lib/aluno/estatisticas";
import { editarEvento, eventoPorId, validarEvento } from "@/lib/eventos";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";
import { hojeLisboa } from "@/lib/tempo";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { id } = await params;
  const { um } = await campos(req);
  const mes = mesValido(um.mes, hojeLisboa());
  const atual = await eventoPorId(id);
  if (!atual) return voltar("/painel/eventos", { mes, erro: "Evento não encontrado" });
  if (atual.cancelado_em) return voltar("/painel/eventos", { mes, erro: "Este evento foi cancelado.", editar: id });
  const v = validarEvento(um);
  if (!v.ok) return voltar("/painel/eventos", { mes, erro: v.erro, editar: id });
  await editarEvento(id, v.dados);
  return voltar("/painel/eventos", { mes, ok: "1" });
}
