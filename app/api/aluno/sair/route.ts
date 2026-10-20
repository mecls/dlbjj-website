import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESSAO, terminarSessao } from "@/lib/aluno/sessao";
import { supabaseConfigured } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_SESSAO)?.value;
  if (token && supabaseConfigured()) await terminarSessao(token);
  const res = NextResponse.redirect(new URL("/aluno/entrar", req.url), 303);
  res.cookies.delete(COOKIE_SESSAO);
  return res;
}
