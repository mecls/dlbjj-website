import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { APP, isProduction } from "@/lib/config";
import { handleInbound } from "@/lib/bot/handle-inbound";

export const runtime = "nodejs";

/**
 * Worker → app: uma mensagem recebida no WhatsApp, já normalizada (spec §6.12).
 * O cabeçalho `x-dlbjj-token` tem de bater com DLBJJ_WORKER_TOKEN em tempo
 * constante. Em produção sem segredo configurado: 503, nunca aberto.
 */
const Corpo = z.object({
  from: z.string().regex(/^\d{8,15}$/),
  text: z.string().max(4000).default(""),
  waMessageId: z.string().max(200).optional(),
  name: z.string().max(120).optional(),
  mediaUrl: z.string().max(1000).optional(),
});

function tokenBate(dado: string | null): boolean {
  const esperado = APP.workerToken();
  if (!esperado || !dado) return false;
  const a = Buffer.from(dado);
  const b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!APP.workerToken() && isProduction()) {
    return new NextResponse("DLBJJ_WORKER_TOKEN não configurado", { status: 503 });
  }
  if (!tokenBate(req.headers.get("x-dlbjj-token"))) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = Corpo.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "corpo inválido", issues: parsed.error.issues }, { status: 400 });
  }

  await handleInbound(parsed.data);
  return NextResponse.json({ ok: true });
}
