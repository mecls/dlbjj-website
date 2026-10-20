import type { NextRequest } from "next/server";
import { cancelarEvento } from "@/lib/eventos";
import { sessaoOu401, voltar } from "@/lib/painel/guard";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { id } = await params;
  if (/^[0-9a-f-]{36}$/.test(id)) await cancelarEvento(id);
  return voltar("/painel/eventos", { ok: "1" });
}
