/**
 * "Terça e Quinta" → [2, 4]. Converte a string `dias` de content/site.ts em
 * dias da semana ISO (segunda = 1 … domingo = 7), que é o que o check-in usa
 * para saber que aulas há hoje.
 *
 * É um parser de palavras, não de gramática: encontra cada nome de dia no
 * texto, por ordem de semana, ignorando acentos e maiúsculas. "Sexta-feira",
 * "sexta" e "SEXTA" valem o mesmo.
 */
const NOMES: ReadonlyArray<readonly [string, number]> = [
  ["segunda", 1],
  ["terca", 2],
  ["quarta", 3],
  ["quinta", 4],
  ["sexta", 5],
  ["sabado", 6],
  ["domingo", 7],
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function diasParaSemana(dias: string): number[] {
  const texto = normalizar(dias);
  const encontrados = NOMES.filter(([nome]) => texto.includes(nome)).map(
    ([, n]) => n,
  );
  if (encontrados.length === 0) {
    throw new Error(`"${dias}" não contém nenhum dia da semana`);
  }
  return encontrados;
}
