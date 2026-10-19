import type { OutboundOption } from "./options";
import { MAX_OPCOES } from "./render";

/**
 * Reconhece, sem modelo, qual das opções numeradas a pessoa escolheu:
 *
 *  1. um dígito → a opção nessa posição ("2" → segunda);
 *  2. o título (sem acentos, maiúsculas ou pontuação) → essa opção;
 *  3. as palavras da resposta aparecem, por ordem, no título de UMA só opção
 *     ("para o filho" → "Para o/a filho/a"; "mim" → "Para mim").
 *
 * Qualquer ambiguidade devolve null e o texto segue para o LLM. Uma resposta
 * feita só de palavras vazias ("o", "a", "para") também devolve null — senão
 * "o" escolhia "Para o/a filho/a" por acaso.
 */
const VAZIAS = new Set(["o", "a", "os", "as", "de", "do", "da", "dos", "das", "para", "e", "ou", "um", "uma", "com", "em", "no", "na"]);

export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(texto: string): string[] {
  return normalizarTexto(texto).split(" ").filter(Boolean);
}

function subsequencia(curta: string[], longa: string[]): boolean {
  let i = 0;
  for (const t of longa) {
    if (t === curta[i]) i++;
    if (i === curta.length) return true;
  }
  return curta.length === 0;
}

export function resolveOptionText(texto: string, options: OutboundOption[]): string | null {
  const visiveis = options.slice(0, MAX_OPCOES);
  const limpo = texto.trim();

  if (/^\d$/.test(limpo)) {
    const idx = Number(limpo) - 1;
    return visiveis[idx]?.id ?? null;
  }

  const ts = tokens(limpo);
  if (ts.length === 0) return null;
  if (!ts.some((t) => t.length >= 3 && !VAZIAS.has(t))) return null;

  const normalizado = ts.join(" ");
  const exatas = visiveis.filter((o) => normalizarTexto(o.title) === normalizado);
  if (exatas.length === 1) return exatas[0].id;

  const parciais = visiveis.filter((o) => subsequencia(ts, tokens(o.title)));
  return parciais.length === 1 ? parciais[0].id : null;
}
