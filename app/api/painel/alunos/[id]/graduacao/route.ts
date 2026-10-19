import type { NextRequest } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { FAIXAS } from "@/lib/alunos/faixas";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { id } = await params;
  const { um } = await campos(req);
  const faixa = um.faixa as (typeof FAIXAS)[number];
  const graus = Number(um.graus ?? 0);
  if (!FAIXAS.includes(faixa) || !Number.isInteger(graus) || graus < 0 || graus > 4 || !/^\d{4}-\d{2}-\d{2}$/.test(um.atribuida_em ?? "")) {
    return voltar(`/painel/alunos/${id}`, { erro: "invalido" });
  }
  const { error } = await serviceClient()
    .from("dlbjj_graduacoes")
    .insert({ aluno_id: id, faixa, graus, atribuida_em: um.atribuida_em, nota: um.nota?.trim() || null });
  if (error) return voltar(`/painel/alunos/${id}`, { erro: error.message });
  return voltar(`/painel/alunos/${id}`, { ok: "1" });
}
