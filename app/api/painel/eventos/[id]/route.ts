import type { NextRequest } from "next/server";
import { editarEvento, eventoPorId, validarEvento } from "@/lib/eventos";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { id } = await params;
  if (!(await eventoPorId(id))) return voltar("/painel/eventos", { erro: "Evento não encontrado" });
  const { um } = await campos(req);
  const v = validarEvento(um);
  if (!v.ok) return voltar("/painel/eventos", { erro: v.erro, editar: id });
  await editarEvento(id, v.dados);
  return voltar("/painel/eventos", { ok: "1" });
}
