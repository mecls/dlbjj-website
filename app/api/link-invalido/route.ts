import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Página de link inválido (reescrita pelo proxy.ts). 410 para expirado, usado
 * ou revogado; 404 para o que nunca existiu. Nunca mostra dados de ninguém.
 */
function pagina(titulo: string, texto: string): string {
  return `<!doctype html>
<html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${titulo} — Academia DL-BJJ</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#231F20;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
main{max-width:28rem;text-align:center}h1{font-size:1.5rem;margin:0 0 .75rem}p{color:#ddd;line-height:1.5}b{color:#ED1C24}</style></head>
<body><main><b>DL-BJJ</b><h1>${titulo}</h1><p>${texto}</p></main></body></html>`;
}

export function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind");
  const motivo = req.nextUrl.searchParams.get("motivo");
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
