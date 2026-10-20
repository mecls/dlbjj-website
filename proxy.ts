import { NextResponse, type NextRequest } from "next/server";
import { ipDe, permitido } from "@/lib/limites";
import { CABECALHO_KIND, CABECALHO_MOTIVO } from "@/lib/link-invalido";
import { verificarToken } from "@/lib/tokens-db";

/**
 * Porta das páginas públicas com token (spec §6.10, §10): /inscricao/<token> e
 * /aluno/<token>. Limita a 10 pedidos por minuto por IP e, se o token não
 * servir, reescreve para a página de link inválido com o estado HTTP certo
 * (410 expirado/usado, 404 desconhecido) — uma página do App Router não
 * consegue devolver 410 por si.
 */
export async function proxy(req: NextRequest) {
  const m = req.nextUrl.pathname.match(/^\/(aluno|inscricao)\/([^/]+)\/?$/);
  if (!m) return NextResponse.next();
  // /aluno/entrar, /aluno/historico, … não são tokens: seguem para as páginas.
  if (m[1] === "aluno" && !/^[A-Za-z0-9_-]{20,}$/.test(m[2])) return NextResponse.next();

  if (!(await permitido("publico", ipDe(req.headers), 10, 60))) {
    return new NextResponse("Demasiados pedidos. Tenta daqui a um minuto.", {
      status: 429,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const kind = m[1] === "aluno" ? "perfil" : "inscricao";
  const { avaliacao } = await verificarToken(decodeURIComponent(m[2]), kind);
  if (avaliacao.ok) return NextResponse.next();

  const destino = new URL("/api/link-invalido", req.url);
  destino.searchParams.set("kind", kind);
  destino.searchParams.set("motivo", avaliacao.motivo);
  // Também em cabeçalhos: um `next dev` sem `-H` perde a query da reescrita.
  const headers = new Headers(req.headers);
  headers.set(CABECALHO_KIND, kind);
  headers.set(CABECALHO_MOTIVO, avaliacao.motivo);
  return NextResponse.rewrite(destino, { request: { headers } });
}

export const config = {
  matcher: ["/aluno/:token", "/inscricao/:token"],
};
