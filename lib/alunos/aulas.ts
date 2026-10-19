import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import { hojeLisboa, somarDias } from "@/lib/tempo";
import type { TurmaRow } from "@/lib/bot/checkin";

export interface LinhaRanking extends TurmaRow {
  presencas: number;
  alunos: number;
}

/** Turmas ativas ordenadas por presenças no período, com alunos distintos. */
export async function rankingAulas(dias: number): Promise<LinhaRanking[]> {
  const db = serviceClient();
  const desde = somarDias(hojeLisboa(), -dias);
  const [{ data: turmas }, { data: presencas }] = await Promise.all([
    db.from("dlbjj_turmas").select("*").eq("ativa", true),
    db.from("dlbjj_presencas").select("turma_id,aluno_id").gte("data", desde),
  ]);
  const porTurma = new Map<string, { n: number; alunos: Set<string> }>();
  for (const p of presencas ?? []) {
    const e = porTurma.get(p.turma_id) ?? { n: 0, alunos: new Set<string>() };
    e.n += 1;
    e.alunos.add(p.aluno_id);
    porTurma.set(p.turma_id, e);
  }
  return ((turmas ?? []) as TurmaRow[])
    .map((t) => ({ ...t, presencas: porTurma.get(t.id)?.n ?? 0, alunos: porTurma.get(t.id)?.alunos.size ?? 0 }))
    .sort((a, b) => b.presencas - a.presencas || b.alunos - a.alunos || a.local_slug.localeCompare(b.local_slug) || a.horario.localeCompare(b.horario));
}

export async function turmaPorId(id: string): Promise<TurmaRow | null> {
  const db = serviceClient();
  const { data } = await db.from("dlbjj_turmas").select("*").eq("id", id).maybeSingle();
  return (data as TurmaRow | null) ?? null;
}

/** O último dia (≤ hoje) em que esta turma teve aula. */
export function ultimoDiaDaTurma(t: TurmaRow, hoje = hojeLisboa()): string {
  for (let i = 0; i < 7; i++) {
    const dia = somarDias(hoje, -i);
    const [y, m, d] = dia.split("-").map(Number);
    const ds = ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
    if (t.dias_semana.includes(ds)) return dia;
  }
  return hoje;
}

/** Alunos ativos da academia da turma (para a lista de presenças) e quem já está marcado nesse dia. */
export async function listaDePresencas(turma: TurmaRow, data: string) {
  const db = serviceClient();
  const [{ data: alunos }, { data: marcados }] = await Promise.all([
    db.from("dlbjj_alunos").select("id,nome,publico,modalidade").eq("local_slug", turma.local_slug).eq("estado", "ativo").order("nome"),
    db.from("dlbjj_presencas").select("aluno_id").eq("turma_id", turma.id).eq("data", data),
  ]);
  const presentes = new Set((marcados ?? []).map((m) => m.aluno_id));
  return ((alunos ?? []) as { id: string; nome: string; publico: string | null; modalidade: string | null }[]).map((a) => ({ ...a, presente: presentes.has(a.id) }));
}
