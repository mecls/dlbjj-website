import { TZDate } from "@date-fns/tz";
import { TIMEZONE } from "@/lib/config";

/**
 * Tudo o que é "hoje", "que horas são" e "que dia da semana é" passa por aqui,
 * em Europe/Lisbon. Nunca `new Date().getDay()` sem fuso: o servidor da Vercel
 * está em UTC e a VPS pode estar em qualquer lado.
 */
function emLisboa(instante: Date): TZDate {
  return new TZDate(instante.getTime(), TIMEZONE);
}

const dois = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" do dia civil em Lisboa. */
export function hojeLisboa(instante: Date = new Date()): string {
  const d = emLisboa(instante);
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

/** "HH:MM" em Lisboa. */
export function horaLisboa(instante: Date = new Date()): string {
  const d = emLisboa(instante);
  return `${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

/** Dia da semana ISO em Lisboa: segunda = 1 … domingo = 7. */
export function diaSemanaLisboa(instante: Date = new Date()): number {
  const d = emLisboa(instante);
  return ((d.getDay() + 6) % 7) + 1;
}

export const NOME_DIA: Record<number, string> = {
  1: "segunda",
  2: "terça",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sábado",
  7: "domingo",
};

/** `inicio <= hora < fim`, ambos "HH:MM" em Lisboa. */
export function dentroDaJanela(inicio: string, fim: string, instante: Date = new Date()): boolean {
  const hora = horaLisboa(instante);
  return hora >= inicio && hora < fim;
}

/** O instante (UTC) correspondente a `dia` + "HH:MM" em Lisboa. */
export function instanteLisboa(dia: string, hora: string): Date {
  const [y, m, d] = dia.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, hh, mm, 0, TIMEZONE).getTime());
}

/** Soma dias a um "YYYY-MM-DD" (calendário, sem fuso). */
export function somarDias(dia: string, n: number): string {
  const [y, m, d] = dia.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${dois(t.getUTCMonth() + 1)}-${dois(t.getUTCDate())}`;
}

/** Dia da semana ISO de um "YYYY-MM-DD" (calendário). */
export function diaSemanaDe(dia: string): number {
  const [y, m, d] = dia.split("-").map(Number);
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
}
