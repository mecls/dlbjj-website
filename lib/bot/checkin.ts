import { diaSemanaDe, diaSemanaLisboa, hojeLisboa, horaLisboa, NOME_DIA, somarDias } from "@/lib/tempo";
import type { Modalidade, Publico } from "./types";

/**
 * Que aula é que "presente" quer dizer hoje? (spec §3 C, passo 2)
 *
 *  1. aulas ATIVAS no espaço do aluno que correm no dia da semana de hoje;
 *  2. dessas, as do tipo do aluno: kids → tipo kids; adulto → tipo = modalidade,
 *     e o treino livre (`misto`) conta para jiu-jitsu e nogi;
 *  3. se não houver nenhuma do tipo, cai para QUALQUER aula do espaço hoje
 *     (fallback = true), porque a pessoa está lá e a presença é real;
 *  4. ordenadas pela hora.
 *
 * Puro: recebe as turmas e o instante, não toca na base de dados.
 */
export interface TurmaRow {
  id: string;
  chave: string;
  local_slug: string;
  turma: string;
  dias: string;
  dias_semana: number[];
  horario: string; // "HH:MM" ou "HH:MM:SS"
  tipo: "kids" | "jiu-jitsu" | "mma" | "misto";
  ativa: boolean;
}

export interface AlunoMin {
  id: string;
  nome: string;
  publico: Publico | null;
  modalidade: Modalidade | null;
  local_slug: string | null;
}

export const hhmm = (horario: string): string => horario.slice(0, 5);

function tipoCombina(aluno: AlunoMin, t: TurmaRow): boolean {
  if (aluno.publico === "kids") return t.tipo === "kids";
  if (t.tipo === "kids") return false;
  if (t.tipo === "misto") return aluno.modalidade === "jiu-jitsu" || aluno.modalidade === "nogi";
  return t.tipo === aluno.modalidade;
}

function doEspacoNoDia(aluno: AlunoMin, turmas: TurmaRow[], diaSemana: number): TurmaRow[] {
  return turmas
    .filter((t) => t.ativa && t.local_slug === aluno.local_slug && t.dias_semana.includes(diaSemana))
    .sort((a, b) => a.horario.localeCompare(b.horario));
}

export function resolverAulasDoDia(
  aluno: AlunoMin,
  turmas: TurmaRow[],
  instante: Date = new Date(),
): { candidatas: TurmaRow[]; fallback: boolean } {
  const hoje = doEspacoNoDia(aluno, turmas, diaSemanaLisboa(instante));
  const doTipo = hoje.filter((t) => tipoCombina(aluno, t));
  if (doTipo.length > 0) return { candidatas: doTipo, fallback: false };
  return { candidatas: hoje, fallback: hoje.length > 0 };
}

/** As turmas ativas do espaço e do tipo do aluno, por hora (calendário e dias seguidos). */
export function turmasDoAluno(aluno: AlunoMin, turmas: TurmaRow[]): TurmaRow[] {
  return turmas
    .filter((t) => t.ativa && t.local_slug === aluno.local_slug && tipoCombina(aluno, t))
    .sort((a, b) => a.horario.localeCompare(b.horario));
}

export interface ProximaAula {
  id: string;
  turma: string;
  dia: string; // YYYY-MM-DD
  diaNome: string;
  horario: string; // HH:MM
}

/** As próximas `n` aulas do tipo do aluno no seu espaço, a partir de agora (até 14 dias). */
export function proximasAulas(aluno: AlunoMin, turmas: TurmaRow[], instante: Date = new Date(), n = 3): ProximaAula[] {
  const hoje = hojeLisboa(instante);
  const agora = horaLisboa(instante);
  const out: ProximaAula[] = [];
  for (let i = 0; i <= 14 && out.length < n; i++) {
    const dia = somarDias(hoje, i);
    const ds = diaSemanaDe(dia);
    const doDia = doEspacoNoDia(aluno, turmas, ds).filter((t) => tipoCombina(aluno, t));
    for (const t of doDia) {
      if (i === 0 && hhmm(t.horario) <= agora) continue;
      out.push({ id: t.id, turma: t.turma, dia, diaNome: NOME_DIA[ds], horario: hhmm(t.horario) });
      if (out.length === n) break;
    }
  }
  return out;
}

/** A próxima aula do tipo do aluno no seu espaço, a partir de agora. */
export function proximaAula(aluno: AlunoMin, turmas: TurmaRow[], instante: Date = new Date()): ProximaAula | null {
  return proximasAulas(aluno, turmas, instante, 1)[0] ?? null;
}
