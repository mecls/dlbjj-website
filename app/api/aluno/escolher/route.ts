import { NextRequest, NextResponse } from "next/server";
import { alunoOu401, COOKIE_SESSAO, trocarAluno } from "@/lib/aluno/sessao";

export const runtime = "nodejs";

/** Irmãos no mesmo telemóvel: muda o aluno visto nesta sessão (só dentro do telemóvel). */
export async function POST(req: NextRequest) {
  const ctx = await alunoOu401();
  if (ctx instanceof NextResponse) return ctx;
  const fd = await req.formData();
  const alunoId = String(fd.get("aluno_id") ?? "");
  const token = req.cookies.get(COOKIE_SESSAO)?.value ?? "";
  if (/^[0-9a-f-]{36}$/.test(alunoId)) await trocarAluno(token, alunoId);
  return NextResponse.redirect(new URL("/aluno", req.url), 303);
}
