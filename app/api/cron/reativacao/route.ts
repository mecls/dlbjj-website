import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { APP, isProduction } from "@/lib/config";
import { correrReativacao } from "@/lib/reativacao/executar";

export const runtime = "nodejs";

/** Cron da Vercel (de hora a hora): avalia as regras e põe os toques na fila. */
export function cronAutorizado(req: NextRequest): NextResponse | null {
  const secret = APP.cronSecret();
  if (!secret) return new NextResponse(isProduction() ? "CRON_SECRET não configurado" : "CRON_SECRET em falta", { status: isProduction() ? 503 : 401 });
  const dado = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(dado);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return new NextResponse("Não autorizado", { status: 401 });
  return null;
}

export async function GET(req: NextRequest) {
  const bloqueio = cronAutorizado(req);
  if (bloqueio) return bloqueio;
  const r = await correrReativacao();
  return NextResponse.json({ ok: true, ...r });
}
