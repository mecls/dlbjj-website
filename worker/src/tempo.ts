/**
 * Hora de Lisboa sem dependências: Intl faz o trabalho. Espelha lib/tempo.ts
 * da app (que usa date-fns); os dois são testados contra os mesmos instantes.
 */
export const TIMEZONE = "Europe/Lisbon";

const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function partes(instante: Date): { dia: string; hora: string } {
  const p = Object.fromEntries(fmt.formatToParts(instante).map((x) => [x.type, x.value]));
  return { dia: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}

export function hojeLisboa(instante: Date = new Date()): string {
  return partes(instante).dia;
}

export function horaLisboa(instante: Date = new Date()): string {
  return partes(instante).hora;
}

export function somarDias(dia: string, n: number): string {
  const [y, m, d] = dia.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** O instante UTC de `dia` às `hora` em Lisboa (fuso 0 ou +1; duas iterações chegam). */
export function instanteLisboa(dia: string, hora: string): Date {
  const [y, m, d] = dia.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  let guess = Date.UTC(y, m - 1, d, hh, mm);
  for (let i = 0; i < 2; i++) {
    const p = partes(new Date(guess));
    const [py, pm, pd] = p.dia.split("-").map(Number);
    const [ph, pmin] = p.hora.split(":").map(Number);
    const wall = Date.UTC(py, pm - 1, pd, ph, pmin);
    const desejado = Date.UTC(y, m - 1, d, hh, mm);
    const diff = wall - desejado;
    if (diff === 0) break;
    guess -= diff;
  }
  return new Date(guess);
}

/** `inicio <= hora < fim` em Lisboa. */
export function dentroDaJanela(inicio: string, fim: string, instante: Date): boolean {
  const h = horaLisboa(instante);
  return h >= inicio && h < fim;
}

/** A próxima abertura da janela: hoje às `inicio` se ainda não passou, senão amanhã. */
export function proximaAbertura(inicio: string, instante: Date): Date {
  const hoje = hojeLisboa(instante);
  const hojeAs = instanteLisboa(hoje, inicio);
  if (hojeAs.getTime() > instante.getTime()) return hojeAs;
  return instanteLisboa(somarDias(hoje, 1), inicio);
}
