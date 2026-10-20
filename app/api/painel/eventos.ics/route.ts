import { NextRequest, NextResponse } from "next/server";
import { isProduction, supabaseConfigured } from "@/lib/config";
import { listarEventos } from "@/lib/eventos";
import { icsDe } from "@/lib/eventos-ics";
import { ipDe, permitido } from "@/lib/limites";
import { chaveValida, obterChaveIcs } from "@/lib/painel/ics-chave";

export const runtime = "nodejs";

/**
 * O feed que o Google Calendar ou o Apple Calendar vão buscar sozinhos
 * (ajustes §2.5). Sem cookie — é uma máquina que o lê — mas com a chave
 * privada na query; sem password do painel não há feed (fecha em produção).
 */
export async function GET(req: NextRequest) {
  if (!supabaseConfigured()) return new NextResponse("Serviço indisponível", { status: 503 });
  if (!(await permitido("ics", ipDe(req.headers), 60, 60))) return new NextResponse("Demasiados pedidos", { status: 429 });
  if (!(await obterChaveIcs())) return new NextResponse(isProduction() ? "Feed não configurado" : "Sem DASHBOARD_PASSWORD", { status: isProduction() ? 503 : 401 });
  if (!(await chaveValida(req.nextUrl.searchParams.get("chave")))) return new NextResponse("Não autorizado", { status: 401 });

  const eventos = await listarEventos("2000-01-01", "2100-12-31");
  return new NextResponse(icsDe(eventos, new Date()), {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="dlbjj-eventos.ics"',
      "cache-control": "no-store",
    },
  });
}
