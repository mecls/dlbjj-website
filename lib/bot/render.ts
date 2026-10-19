import type { OutboundOption } from "./options";

/**
 * Opções como texto numerado (spec §4.0). O Baileys não entrega botões nem
 * listas interativas de forma fiável, por isso cada pergunta com opções sai
 * assim:
 *
 *   A inscrição é para ti ou para um/a filho/a?
 *
 *   1. Para mim
 *   2. Para o/a filho/a
 *
 *   (Responde com o número)
 *
 * No máximo 9 opções (um dígito). Sem opções, só o texto.
 */
export const MAX_OPCOES = 9;

export function renderOptions(texto: string, options: OutboundOption[]): string {
  if (options.length === 0) return texto;
  const linhas = options
    .slice(0, MAX_OPCOES)
    .map((o, i) => `${i + 1}. ${o.title}`);
  return `${texto}\n\n${linhas.join("\n")}\n\n(Responde com o número)`;
}
