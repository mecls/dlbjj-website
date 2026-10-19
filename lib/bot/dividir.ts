/**
 * Máximo de 900 caracteres por mensagem (spec §4.0). Divide nas linhas em
 * branco; um parágrafo sozinho acima do limite corta-se no último espaço.
 */
export const MAX_CARACTERES = 900;

function cortarParagrafo(texto: string, max: number): string[] {
  const partes: string[] = [];
  let resto = texto;
  while (resto.length > max) {
    let corte = resto.lastIndexOf(" ", max);
    if (corte <= 0) corte = max;
    partes.push(resto.slice(0, corte).trimEnd());
    resto = resto.slice(corte).trimStart();
  }
  if (resto) partes.push(resto);
  return partes;
}

export function dividirCorpo(texto: string, max = MAX_CARACTERES): string[] {
  if (texto.length <= max) return [texto];
  const partes: string[] = [];
  let atual = "";
  for (const paragrafo of texto.split("\n\n")) {
    const pedacos = paragrafo.length > max ? cortarParagrafo(paragrafo, max) : [paragrafo];
    for (const p of pedacos) {
      const candidato = atual ? `${atual}\n\n${p}` : p;
      if (candidato.length <= max) {
        atual = candidato;
      } else {
        if (atual) partes.push(atual);
        atual = p;
      }
    }
  }
  if (atual) partes.push(atual);
  return partes;
}
