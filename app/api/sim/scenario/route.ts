import { NextRequest, NextResponse } from "next/server";
import type { InboundMessage } from "@/lib/bot/types";
import { handleInbound } from "@/lib/bot/handle-inbound";
import { simAllowed } from "@/lib/sim-guard";

export const runtime = "nodejs";

/**
 * Percursos de onboarding com guião (para demo/verificação sem a Meta). Cada
 * passo é injetado em sequência no motor; abre depois /painel/<phone> para ver a
 * conversa. Os ids dos botões são estáveis (ver lib/bot/flow.ts).
 *
 *   curl -X POST 'localhost:3000/api/sim/scenario?nome=adulto-jj'
 *   curl -X POST 'localhost:3000/api/sim/scenario?nome=kids'
 *   curl -X POST 'localhost:3000/api/sim/scenario?nome=pergunta-preco'  (precisa de Ollama)
 */
type Passo = Partial<Pick<InboundMessage, "text" | "buttonId" | "name">>;

const CENARIOS: Record<string, Passo[]> = {
  // Adulto → Jiu-Jitsu → Queluz → 1.º horário → Instagram → confirma (só dígitos)
  "adulto-jj": [
    { text: "Olá, queria experimentar", name: "Miguel Teste" },
    { text: "Miguel" },
    { text: "1" }, // Para mim
    { text: "1" }, // Jiu-Jitsu
    { text: "1" }, // Queluz
    { text: "1" }, // 08:00 Jiu-Jitsu (Adultos)
    { text: "1" }, // Instagram
    { text: "1" }, // Sim, confirmo
  ],
  // Kids → (salta modalidade) → BJJ Kids Amadora → 1.º horário → Google → confirma
  kids: [
    { text: "Boa tarde", name: "Ana Teste" },
    { text: "Ana" },
    { text: "2" }, // Para o/a filho/a
    { text: "2" }, // BJJ Kids (2.º espaço: Queluz, BJJ Kids)
    { text: "1" }, // 17:30
    { text: "2" }, // Google
    { text: "1" }, // Sim, confirmo
  ],
  // Pergunta fora do guião — NÃO pode inventar preço.
  "pergunta-preco": [
    { text: "Olá", name: "João Teste" },
    { text: "João" },
    { text: "quanto custa a mensalidade?" },
  ],
  // Questão sensível → passa ao Daniel e cala-se.
  "pergunta-sensivel": [
    { text: "Olá", name: "Rita Teste" },
    { text: "Rita" },
    { text: "o meu filho tem autismo, podem acompanhar?" },
  ],
};

export async function POST(req: NextRequest) {
  if (!simAllowed(req)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const nome = req.nextUrl.searchParams.get("nome") ?? "adulto-jj";
  const passos = CENARIOS[nome];
  if (!passos) {
    return NextResponse.json(
      { error: `cenário desconhecido: ${nome}`, disponiveis: Object.keys(CENARIOS) },
      { status: 400 },
    );
  }

  const from =
    req.nextUrl.searchParams.get("phone") ?? `35190${String(Date.now()).slice(-7)}`;

  for (const passo of passos) {
    await handleInbound({
      from,
      text: passo.text ?? "",
      buttonId: passo.buttonId,
      name: passo.name,
    });
  }

  return NextResponse.json({ ok: true, cenario: nome, phone: from, passos: passos.length });
}
