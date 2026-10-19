import { NextRequest, NextResponse } from "next/server";
import { turmasAtivas } from "@/lib/alunos/consultas";
import { paginaAviso, paginaHtml } from "@/lib/html";
import { criarAluno } from "@/lib/inscricao/criar";
import { ESTILO_FORMULARIO, formularioHtml } from "@/lib/inscricao/formulario";
import { validarInscricao } from "@/lib/inscricao/validar";
import { verificarToken } from "@/lib/tokens-db";

export const runtime = "nodejs";

const HTML = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" };
const LINK_INVALIDO = paginaAviso("Este link já não é válido", "Escreve-nos no WhatsApp (925 797 266) e enviamos-te um novo.");

/**
 * Submissão do formulário (POST de um <form> normal, sem JavaScript).
 * 410 se o token não servir; 422 com o formulário e os erros por campo; 200
 * com a confirmação quando o aluno fica criado (spec §3 B, §6.9, §6.10).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { avaliacao, row } = await verificarToken(token, "inscricao");
  if (!avaliacao.ok) {
    return new NextResponse(LINK_INVALIDO, { status: avaliacao.motivo === "desconhecido" ? 404 : 410, headers: HTML });
  }

  const fd = await req.formData();
  const campos: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") campos[k] = v;

  const r = validarInscricao(campos);
  if (!r.ok) {
    const turmas = await turmasAtivas();
    const corpo = `<main><div class="marca">DL-BJJ</div><h1>Inscrição</h1>${formularioHtml({
      action: `/api/inscricao/${encodeURIComponent(token)}`,
      valores: campos,
      erros: r.erros,
      turmas,
    })}</main>`;
    return new NextResponse(paginaHtml("Inscrição", corpo, { estilo: ESTILO_FORMULARIO }), { status: 422, headers: HTML });
  }

  try {
    await criarAluno(token, row?.lead_id ?? null, r.dados);
  } catch (e) {
    console.error("[inscricao] criarAluno falhou", e);
    return new NextResponse(paginaAviso("Não foi possível concluir", "Tenta outra vez daqui a uns minutos ou escreve-nos no WhatsApp (925 797 266)."), { status: 500, headers: HTML });
  }
  return new NextResponse(paginaAviso("Inscrição recebida", "Inscrição recebida. Vais receber uma confirmação no WhatsApp."), { status: 200, headers: HTML });
}
