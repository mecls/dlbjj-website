import { NextRequest, NextResponse } from "next/server";
import { anonimizarAntigos } from "@/lib/anonimizar";
import { serviceClient } from "@/lib/supabase/service";
import { cronAutorizado } from "../reativacao/route";

export const runtime = "nodejs";

/** Cron mensal: 24 meses sem contacto → anonimizar; limpeza de fila (90 d), perguntas (12 m) e limites expirados. */
export async function GET(req: NextRequest) {
  const bloqueio = cronAutorizado(req);
  if (bloqueio) return bloqueio;
  const r = await anonimizarAntigos();
  const db = serviceClient();
  const d90 = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const m12 = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const limpezas = await Promise.all([
    db.from("dlbjj_fila_saida").delete().lt("created_at", d90).in("estado", ["enviada", "falhou", "cancelada", "desconhecido"]),
    db.from("dlbjj_perguntas").delete().lt("created_at", m12),
    db.from("dlbjj_limites").delete().lt("expira_em", new Date().toISOString()),
  ]);
  const erros = limpezas.map((l) => l.error?.message).filter(Boolean);
  if (erros.length) {
    console.error("[cron/anonimizar] limpezas falharam", erros);
    return NextResponse.json({ ok: false, ...r, erros }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...r });
}
