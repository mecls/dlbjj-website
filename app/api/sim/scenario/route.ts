import { NextRequest, NextResponse } from "next/server";
import type { InboundMessage } from "@/lib/messaging/provider";
import { handleInbound } from "@/lib/bot/handle-inbound";

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
  // Adulto → Jiu-Jitsu → Queluz → 1.º horário → Instagram → confirma
  "adulto-jj": [
    { text: "Olá, queria experimentar", name: "Miguel Teste" },
    { text: "Miguel" },
    { buttonId: "pub:adulto" },
    { buttonId: "mod:jiu-jitsu" },
    { buttonId: "loc:queluz" },
    { buttonId: "hor:0" },
    { buttonId: "org:instagram" },
    { buttonId: "cfm:sim" },
  ],
  // Kids → (salta modalidade) → BJJ Kids Amadora → 1.º horário → Google → confirma
  kids: [
    { text: "Boa tarde", name: "Ana Teste" },
    { text: "Ana" },
    { buttonId: "pub:kids" },
    { buttonId: "loc:kids-amadora" },
    { buttonId: "hor:0" },
    { buttonId: "org:google" },
    { buttonId: "cfm:sim" },
  ],
  // Pergunta fora do guião — NÃO pode inventar preço (precisa do Ollama).
  "pergunta-preco": [
    { text: "Olá", name: "João Teste" },
    { text: "João" },
    { text: "quanto custa a mensalidade?" },
  ],
};

export async function POST(req: NextRequest) {
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
