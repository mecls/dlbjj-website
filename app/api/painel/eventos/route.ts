import type { NextRequest } from "next/server";
import { criarEvento, validarEvento } from "@/lib/eventos";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { um } = await campos(req);
  const v = validarEvento(um);
  if (!v.ok) return voltar("/painel/eventos", { erro: v.erro });
  await criarEvento(v.dados);
  return voltar("/painel/eventos", { ok: "1" });
}
