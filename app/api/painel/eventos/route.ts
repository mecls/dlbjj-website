import type { NextRequest } from "next/server";
import { mesValido } from "@/lib/aluno/estatisticas";
import { criarEvento, validarEvento } from "@/lib/eventos";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";
import { hojeLisboa } from "@/lib/tempo";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { um } = await campos(req);
  const mes = mesValido(um.mes, hojeLisboa());
  const v = validarEvento(um);
  if (!v.ok) return voltar("/painel/eventos", { mes, erro: v.erro, novo: /^\d{4}-\d{2}-\d{2}$/.test(um.dia ?? "") ? um.dia : hojeLisboa() });
  await criarEvento(v.dados);
  return voltar("/painel/eventos", { mes, ok: "1" });
}
