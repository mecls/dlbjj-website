import type { NextRequest } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";

export const runtime = "nodejs";

/** Marca presenças de vários alunos numa aula e dia; as repetidas são ignoradas. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ turmaId: string }> }) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { turmaId } = await params;
  const { um, muitos } = await campos(req);
  const data = um.data ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return voltar(`/painel/aulas/${turmaId}`, { erro: "data inválida" });
  const ids = muitos.aluno_ids ?? [];
  const db = serviceClient();
  for (const alunoId of ids) {
    const { error } = await db.from("dlbjj_presencas").insert({ aluno_id: alunoId, turma_id: turmaId, data, origem: "painel" });
    if (error && error.code !== "23505") return voltar(`/painel/aulas/${turmaId}`, { data, erro: error.message });
  }
  if (ids.length) await db.from("dlbjj_alunos").update({ estado: "ativo" }).in("id", ids).eq("estado", "inativo");
  return voltar(`/painel/aulas/${turmaId}`, { data, ok: "1" });
}
