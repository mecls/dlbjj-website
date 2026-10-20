import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import { rankingAulas, type LinhaRanking } from "@/lib/alunos/aulas";
import { faixaAtual, type Faixa } from "@/lib/alunos/faixas";
import { turmasAtivas } from "@/lib/alunos/consultas";
import { somarDias } from "@/lib/tempo";
import { aulasDaSemana, type LinhaRankingAluno, type PresencaDia } from "./estatisticas";

/**
 * O que a área do aluno lê (design §5, §8): as presenças do próprio, contagens
 * por aluno para o ranking (só ativos e visíveis) e números agregados da
 * academia. Colunas explícitas; nada de saúde, encarregado ou contactos.
 */
export interface PresencaAluno {
  data: string;
  turma_id: string;
  dlbjj_turmas: { turma: string; horario: string; local_slug: string } | null;
}

export async function presencasDoAluno(alunoId: string, desde?: string): Promise<PresencaAluno[]> {
  const db = serviceClient();
  let q = db.from("dlbjj_presencas").select("data,turma_id,dlbjj_turmas(turma,horario,local_slug)").eq("aluno_id", alunoId);
  if (desde) q = q.gte("data", desde);
  const { data } = await q.order("data", { ascending: false });
  return (data ?? []) as unknown as PresencaAluno[];
}

async function alunosNoRanking(): Promise<{ id: string; nome: string }[]> {
  const { data } = await serviceClient().from("dlbjj_alunos").select("id,nome").eq("estado", "ativo").eq("ranking_visivel", true);
  return (data ?? []) as { id: string; nome: string }[];
}

async function presencasPorAluno(ids: string[], desde: string | null): Promise<Map<string, number>> {
  const porAluno = new Map<string, number>();
  if (ids.length === 0) return porAluno;
  let q = serviceClient().from("dlbjj_presencas").select("aluno_id").in("aluno_id", ids);
  if (desde) q = q.gte("data", desde);
  const { data } = await q;
  for (const p of data ?? []) porAluno.set(p.aluno_id, (porAluno.get(p.aluno_id) ?? 0) + 1);
  return porAluno;
}

/** Uma entrada por aluno ativo e visível (0 quando não tem presenças no período). */
export async function contagensPorAluno(desde: string | null): Promise<{ alunoId: string; n: number }[]> {
  const alunos = await alunosNoRanking();
  const porAluno = await presencasPorAluno(alunos.map((a) => a.id), desde);
  return alunos.map((a) => ({ alunoId: a.id, n: porAluno.get(a.id) ?? 0 }));
}

/** As linhas do ranking (por ordenar): nome, faixa atual e contagem no período. */
export async function rankingAlunos(periodo: "mes" | "sempre", hoje: string): Promise<LinhaRankingAluno[]> {
  const alunos = await alunosNoRanking();
  const ids = alunos.map((a) => a.id);
  const desde = periodo === "mes" ? `${hoje.slice(0, 7)}-01` : null;
  const [porAluno, { data: grads }] = await Promise.all([
    presencasPorAluno(ids, desde),
    ids.length ? serviceClient().from("dlbjj_graduacoes").select("aluno_id,faixa,graus,atribuida_em,created_at").in("aluno_id", ids) : Promise.resolve({ data: [] as never[] }),
  ]);
  const gradsPor = new Map<string, { faixa: Faixa; graus: number; atribuida_em: string; created_at: string }[]>();
  for (const g of (grads ?? []) as { aluno_id: string; faixa: Faixa; graus: number; atribuida_em: string; created_at: string }[]) {
    (gradsPor.get(g.aluno_id) ?? gradsPor.set(g.aluno_id, []).get(g.aluno_id)!).push(g);
  }
  return alunos.map((a) => ({ alunoId: a.id, nome: a.nome, faixa: faixaAtual(gradsPor.get(a.id) ?? []), n: porAluno.get(a.id) ?? 0 }));
}

export interface NumerosAcademia {
  aulasSemana: number;
  presencasMes: number;
  alunosAtivos: number;
  turmaTop: LinhaRanking | null;
  presencasRecentes: PresencaDia[];
}

/** Contagens da academia inteira — só números, nada de ninguém. */
export async function numerosAcademia(hoje: string): Promise<NumerosAcademia> {
  const db = serviceClient();
  const primeiroDoMes = `${hoje.slice(0, 7)}-01`;
  const [turmas, { count: presencasMes }, { count: alunosAtivos }, ranking, { data: recentes }] = await Promise.all([
    turmasAtivas(),
    db.from("dlbjj_presencas").select("*", { count: "exact", head: true }).gte("data", primeiroDoMes),
    db.from("dlbjj_alunos").select("*", { count: "exact", head: true }).eq("estado", "ativo"),
    rankingAulas(30),
    db.from("dlbjj_presencas").select("data").gte("data", somarDias(hoje, -91)),
  ]);
  const top = ranking[0];
  return {
    aulasSemana: aulasDaSemana(turmas),
    presencasMes: presencasMes ?? 0,
    alunosAtivos: alunosAtivos ?? 0,
    turmaTop: top && top.presencas > 0 ? top : null,
    presencasRecentes: (recentes ?? []) as PresencaDia[],
  };
}
