import { NextRequest, NextResponse } from "next/server";
import { loginWith } from "@/lib/auth";
import { ipDe, permitido } from "@/lib/limites";

export const runtime = "nodejs";

/** Login do painel: 5 tentativas por IP em 15 minutos; depois "Demasiadas tentativas". */
export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const password = String(fd.get("password") ?? "");
  if (!(await permitido("login", ipDe(req.headers), 5, 900))) {
    return NextResponse.redirect(new URL("/painel/login?erro=limite", req.url), 303);
  }
  const ok = await loginWith(password);
  return NextResponse.redirect(new URL(ok ? "/painel" : "/painel/login?erro=1", req.url), 303);
}
