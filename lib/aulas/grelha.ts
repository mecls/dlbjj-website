import type { LinhaRanking } from "@/lib/alunos/aulas";

/**
 * O horário semanal de um espaço (ajustes §2.4): dias (ISO, só os que têm
 * aula), horas distintas (HH:MM, crescentes) e, por célula `${dia}|${hora}`,
 * as turmas que correm nesse momento, pelo nome. Puro.
 */
export interface GrelhaSemanal {
  dias: number[];
  horas: string[];
  celulas: Record<string, LinhaRanking[]>;
}

export function grelhaSemanal(turmas: LinhaRanking[]): GrelhaSemanal {
  const dias = [...new Set(turmas.flatMap((t) => t.dias_semana))].sort((a, b) => a - b);
  const horas = [...new Set(turmas.map((t) => t.horario.slice(0, 5)))].sort();
  const celulas: Record<string, LinhaRanking[]> = {};
  for (const t of turmas) {
    const hora = t.horario.slice(0, 5);
    for (const dia of t.dias_semana) {
      (celulas[`${dia}|${hora}`] ??= []).push(t);
    }
  }
  for (const k of Object.keys(celulas)) celulas[k].sort((a, b) => a.turma.localeCompare(b.turma, "pt"));
  return { dias, horas, celulas };
}
