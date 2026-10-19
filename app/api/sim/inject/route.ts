import { NextRequest, NextResponse } from "next/server";
import type { InboundMessage } from "@/lib/bot/types";
import { handleInbound } from "@/lib/bot/handle-inbound";
import { simAllowed } from "@/lib/sim-guard";

export const runtime = "nodejs";

/**
 * Injetor do simulador — mete uma mensagem falsa diretamente no mesmo motor que
 * o webhook real usa. Serve para testar todo o fluxo de onboarding sem depender
 * da Meta (ativo enquanto o WhatsApp não estiver configurado; inofensivo depois).
 *
 *   curl -X POST localhost:3000/api/sim/inject -H 'Content-Type: application/json' \
 *     -d '{"from":"351900000001","name":"Miguel","text":"Olá"}'
 *
 * Fechada em produção (ver lib/sim-guard.ts): responde 404, para não anunciar
 * que existe.
 */
export async function POST(req: NextRequest) {
  if (!simAllowed(req)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const body = (await req.json()) as Partial<InboundMessage>;
  if (!body.from) {
    return NextResponse.json({ error: "from is required" }, { status: 400 });
  }
  const msg: InboundMessage = {
    from: body.from,
    text: body.text ?? "",
    buttonId: body.buttonId,
    mediaUrl: body.mediaUrl,
    name: body.name,
  };
  await handleInbound(msg);
  return NextResponse.json({ ok: true });
}
