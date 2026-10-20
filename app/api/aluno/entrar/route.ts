import { NextRequest, NextResponse } from "next/server";
import { alunosDoTelefone } from "@/lib/alunos/consultas";
import { verificarCodigo } from "@/lib/aluno/codigos";
import { COOKIE_ENTRAR, COOKIE_SESSAO, criarSessao, opcoesCookie, VALIDADE_SESSAO_DIAS } from "@/lib/aluno/sessao";
import { supabaseConfigured } from "@/lib/config";

export const runtime = "nodejs";

/** Passo 2 do login do aluno: confere o código e abre a sessão de 90 dias. */
export async function POST(req: NextRequest) {
  if (!supabaseConfigured()) return new NextResponse("Serviço indisponível", { status: 503 });
  const phone = req.cookies.get(COOKIE_ENTRAR)?.value;
  const ir = (q: string) => NextResponse.redirect(new URL(`/aluno/entrar${q}`, req.url), 303);
  if (!phone) return ir("");

  const fd = await req.formData();
  const resultado = await verificarCodigo(phone, String(fd.get("codigo") ?? ""));
  if (resultado === "bloqueado") return ir("?passo=codigo&erro=bloqueado");
  if (resultado !== "ok") return ir("?passo=codigo&erro=codigo");

  const alunos = await alunosDoTelefone(phone);
  if (alunos.length === 0) return ir("?passo=codigo&erro=codigo");
  const token = await criarSessao(phone, alunos[0].id);
  const res = NextResponse.redirect(new URL("/aluno", req.url), 303);
  res.cookies.set(COOKIE_SESSAO, token, opcoesCookie(VALIDADE_SESSAO_DIAS * 86_400));
  res.cookies.delete(COOKIE_ENTRAR);
  return res;
}
