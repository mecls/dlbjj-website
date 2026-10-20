import { NextRequest, NextResponse } from "next/server";
import { alunoPublicoPorId } from "@/lib/alunos/consultas";
import { COOKIE_SESSAO, criarSessao, opcoesCookie, VALIDADE_SESSAO_DIAS } from "@/lib/aluno/sessao";
import { supabaseConfigured } from "@/lib/config";
import { reclamarTokenPerfil } from "@/lib/tokens-db";

export const runtime = "nodejs";

/** O botão "Entrar" da página do link: consome o token (uma vez só) e abre a sessão. */
export async function POST(req: NextRequest) {
  if (!supabaseConfigured()) return new NextResponse("Serviço indisponível", { status: 503 });
  const fd = await req.formData();
  const token = String(fd.get("token") ?? "");
  const ir = (q: string) => NextResponse.redirect(new URL(`/aluno/entrar${q}`, req.url), 303);

  const row = await reclamarTokenPerfil(token);
  if (!row?.aluno_id) return ir("?erro=link");
  const aluno = await alunoPublicoPorId(row.aluno_id);
  if (!aluno || aluno.estado === "anonimizado" || aluno.estado === "ex_aluno") return ir("?erro=link");

  const sessao = await criarSessao(aluno.phone, aluno.id);
  const res = NextResponse.redirect(new URL("/aluno", req.url), 303);
  res.cookies.set(COOKIE_SESSAO, sessao, opcoesCookie(VALIDADE_SESSAO_DIAS * 86_400));
  return res;
}
