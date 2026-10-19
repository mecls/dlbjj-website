import { sessaoOu401, voltar } from "@/lib/painel/guard";
import { correrReativacao } from "@/lib/reativacao/executar";

export const runtime = "nodejs";

export async function POST() {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  await correrReativacao();
  return voltar("/painel/reativacao", { ok: "1" });
}
