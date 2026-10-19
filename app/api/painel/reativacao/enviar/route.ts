import type { NextRequest } from "next/server";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";
import { enviarAgora } from "@/lib/reativacao/executar";
import type { Regra } from "@/lib/reativacao/regras";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { um } = await campos(req);
  if (!/^\d{8,15}$/.test(um.phone ?? "") || !/^R[1-5]$/.test(um.regra ?? "")) return voltar("/painel/reativacao", { erro: "pedido inválido" });
  const r = await enviarAgora(um.phone, um.regra as Regra);
  return voltar("/painel/reativacao", r.toques ? { ok: "1" } : { erro: "essa pessoa já não está em atraso nessa regra" });
}
