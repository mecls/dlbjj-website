import type { NextRequest } from "next/server";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";
import { responder } from "@/lib/perguntar/responder";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { um } = await campos(req);
  const pergunta = (um.pergunta ?? "").trim().slice(0, 500);
  if (!pergunta) return voltar("/painel/perguntar", { erro: "Escreve uma pergunta." });
  try {
    await Promise.race([responder(pergunta), new Promise((_, rej) => setTimeout(() => rej(new Error("tempo esgotado")), 20_000))]);
  } catch (e) {
    return voltar("/painel/perguntar", { erro: `Não consegui responder agora (${e instanceof Error ? e.message : "erro"}). Tenta outra vez.` });
  }
  return voltar("/painel/perguntar");
}
