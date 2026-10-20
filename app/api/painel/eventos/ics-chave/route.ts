import { criarChaveIcs } from "@/lib/painel/ics-chave";
import { sessaoOu401, voltar } from "@/lib/painel/guard";

export const runtime = "nodejs";

/** «Gerar nova chave»: a antiga deixa de servir; quem subscreveu tem de voltar a subscrever. */
export async function POST() {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  await criarChaveIcs();
  return voltar("/painel/eventos", { ok: "1" });
}
