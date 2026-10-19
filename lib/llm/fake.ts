import { normalizarTexto } from "@/lib/bot/resolve";
import type { NluResult } from "@/lib/bot/nlu";

/**
 * O "modelo" dos testes e do dev sem rede (`OLLAMA_FAKE=1`). Uma tabela de
 * respostas por texto normalizado; o que não estiver aqui é "outro" com
 * confiança zero — o motor repete a pergunta, que é o comportamento seguro.
 *
 * Nunca inventa: a resposta ao preço é a frase fixa que o modelo real também
 * tem de dar (spec §6.8).
 */
const TABELA: Record<string, Partial<NluResult>> = {
  "quanto custa a mensalidade": {
    intent: "pergunta",
    answer: "A primeira aula é grátis; o Daniel confirma os valores diretamente contigo. 🙂",
  },
  "quanto custa": {
    intent: "pergunta",
    answer: "A primeira aula é grátis; o Daniel confirma os valores diretamente contigo. 🙂",
  },
  "o meu filho tem autismo podem acompanhar": {
    intent: "outro",
    needs_human: true,
    human_reason: "questão sensível",
  },
  "onde fica queluz": {
    intent: "pergunta",
    answer: "Queluz: Av. da República 97, 2745-213 Queluz.",
  },
};

export function interpretFake(text: string): NluResult {
  const chave = normalizarTexto(text);
  const base: NluResult = {
    intent: "outro",
    match_id: null,
    confidence: 0,
    answer: null,
    needs_human: false,
    human_reason: null,
  };
  return { ...base, ...(TABELA[chave] ?? {}) };
}
