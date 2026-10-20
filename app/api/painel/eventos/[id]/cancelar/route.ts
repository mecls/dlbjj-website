import type { NextRequest } from "next/server";
import { mesValido } from "@/lib/aluno/estatisticas";
import { cancelarEvento } from "@/lib/eventos";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";
import { hojeLisboa } from "@/lib/tempo";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { id } = await params;
  const { um } = await campos(req);
  const mes = mesValido(um.mes, hojeLisboa());
  if (/^[0-9a-f-]{36}$/.test(id)) await cancelarEvento(id);
  return voltar("/painel/eventos", { mes, ok: "1" });
}
