import { NextRequest, NextResponse } from "next/server";
import { paginaAviso as pagina } from "@/lib/html";
import { CABECALHO_KIND, CABECALHO_MOTIVO } from "@/lib/link-invalido";

export const runtime = "nodejs";

/**
 * Página de link inválido (reescrita pelo proxy.ts). 410 para expirado, usado
 * ou revogado; 404 para o que nunca existiu. Nunca mostra dados de ninguém.
 */
export function GET(req: NextRequest) {
  const kind = req.headers.get(CABECALHO_KIND) ?? req.nextUrl.searchParams.get("kind");
  const motivo = req.headers.get(CABECALHO_MOTIVO) ?? req.nextUrl.searchParams.get("motivo");
  const headers = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" };

  if (motivo === "desconhecido" || motivo === "tipo") {
    return new NextResponse(pagina("Página não encontrada", "Este link não existe."), { status: 404, headers });
  }
  if (kind === "perfil") {
    return new NextResponse(
      pagina("Este link expirou", "Escreve <strong>perfil</strong> no WhatsApp para receberes um novo."),
      { status: 410, headers },
    );
  }
  return new NextResponse(
    pagina("Este link já não é válido", "Escreve-nos no WhatsApp (925 797 266) e enviamos-te um novo."),
    { status: 410, headers },
  );
}
