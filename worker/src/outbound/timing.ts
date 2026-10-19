/**
 * Temporizações humanas (spec §9 "humanisation", ARwatches §7, em versão leve):
 * gaussiana (Box-Muller) em vez de intervalos uniformes, porque num histograma
 * de centenas de envios a planura É um padrão.
 */
export function gaussiana(media: number, desvio: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return media + z * desvio;
}

function jitter(valor: number, fracao: number): number {
  return valor * (1 + (Math.random() * 2 - 1) * fracao);
}

/** Indicador "a escrever": ~`wpm` palavras/min (palavra = 5 caracteres), limites sorteados. */
export function tempoDeEscrita(texto: string, wpm: number, humanizar = true): number {
  if (!humanizar) return 0;
  const palavras = Math.max(1, texto.length / 5);
  const base = (palavras / Math.max(10, wpm)) * 60_000;
  const minimo = jitter(1_500, 0.1);
  const maximo = jitter(12_000, 0.1);
  return Math.round(Math.min(maximo, Math.max(minimo, jitter(base, 0.2))));
}

/** Pausa antes de responder: gaussiana em segundos, nunca abaixo de 3 s. */
export function atrasoResposta(mediaS: number, desvioS: number, humanizar = true): number {
  if (!humanizar) return 0;
  return Math.round(Math.max(3_000, gaussiana(mediaS, desvioS) * 1_000));
}

/** Espaço entre proativas consecutivas (segundos → ms), nunca abaixo de 20 s. */
export function intervaloProativa(mediaS: number, desvioS: number, humanizar = true): number {
  if (!humanizar) return 0;
  return Math.round(Math.max(20_000, gaussiana(mediaS, desvioS) * 1_000));
}

/** ±20 % num intervalo de temporizador: uma drenagem metronómica é um padrão. */
export function comJitter(ms: number): number {
  return Math.round(jitter(ms, 0.2));
}
