import { NextRequest, NextResponse } from "next/server";
import type { InboundMessage } from "@/lib/messaging/provider";
import { handleInbound } from "@/lib/bot/handle-inbound";

export const runtime = "nodejs";

/**
 * Injetor do simulador — mete uma mensagem falsa diretamente no mesmo motor que
 * o webhook real usa. Serve para testar todo o fluxo de onboarding sem depender
 * da Meta (ativo enquanto o WhatsApp não estiver configurado; inofensivo depois).
 *
 *   curl -X POST localhost:3000/api/sim/inject -H 'Content-Type: application/json' \
 *     -d '{"from":"351900000001","name":"Miguel","text":"Olá"}'
 */
export async function POST(req: NextRequest) {
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
