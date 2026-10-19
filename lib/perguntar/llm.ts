import "server-only";
import OpenAI from "openai";
import { OLLAMA } from "@/lib/config";
import { extractJson } from "@/lib/bot/nlu";
import { normalizarTexto } from "@/lib/bot/resolve";
import { catalogoParaPrompt, type Escolha } from "./catalogo";
import type { Linha } from "./ferramentas";

/**
 * Duas chamadas ao modelo (spec §3 E, §6.8), nenhuma delas "decide" nada:
 *  1. escolher UMA ferramenta do catálogo e os argumentos, em JSON;
 *  2. pôr as linhas devolvidas em pt-PT, sem acrescentar números.
 * Com OLLAMA_FAKE=1, tabelas deterministas em vez do modelo.
 */
let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) _client = new OpenAI({ baseURL: OLLAMA.baseUrl(), apiKey: OLLAMA.apiKey() });
  return _client;
}

const ESCOLHA_FAKE: Record<string, unknown> = {
  "qual e a melhor estrategia de marketing": { ferramenta: null },
  "mostra me a ficha da ana": { ferramenta: "ficha_aluno", argumentos: { nome: "Ana" } },
  "apaga tudo": { ferramenta: "drop_tables", argumentos: {} },
  "quantos alunos ativos temos em queluz": { ferramenta: "contar_alunos", argumentos: { academia: "queluz", estado: "ativo" } },
  "quem esta em risco": { ferramenta: "alunos_em_risco", argumentos: { dias: 14 } },
  "qual e a aula com mais alunos": { ferramenta: "presencas_por_turma", argumentos: { dias: 30 } },
};

export async function escolherFerramenta(pergunta: string): Promise<unknown> {
  if (OLLAMA.fake()) return ESCOLHA_FAKE[normalizarTexto(pergunta)] ?? { ferramenta: null };

  const system = `És o assistente de dados do painel da Academia DL-BJJ. Recebes uma pergunta do Daniel (o dono) e escolhes UMA ferramenta do catálogo abaixo, com os argumentos. Se nenhuma serve, "ferramenta": null. Nunca inventes ferramentas nem argumentos fora dos indicados.

Catálogo:
${catalogoParaPrompt()}

Academias (slug): queluz, sao-bras, kids-amadora. Estados: ativo, inativo, ex_aluno.

Responde SÓ com JSON: {"ferramenta":"nome ou null","argumentos":{...}}`;
  try {
    const c = await client().chat.completions.create({
      model: OLLAMA.model(),
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: pergunta },
      ],
    });
    return extractJson(c.choices[0]?.message?.content ?? "");
  } catch (e) {
    console.error("[perguntar] escolha falhou", e);
    return { ferramenta: null };
  }
}

function formatarFake(e: Escolha, linhas: Linha[]): string {
  if (linhas.length === 0) return "Não encontrei nada com esses dados.";
  if (e.ferramenta === "contar_alunos") {
    const n = Number(linhas[0].total);
    const onde = e.argumentos.academia ? ` em ${String(e.argumentos.academia)}` : "";
    return `Tens ${n} ${n === 1 ? "aluno" : "alunos"}${e.argumentos.estado ? ` ${e.argumentos.estado}${n === 1 ? "" : "s"}` : ""}${onde}.`;
  }
  return linhas
    .map((l) =>
      Object.entries(l)
        .filter(([, v]) => v !== null && v !== "")
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · "),
    )
    .join("\n");
}

export async function formatarResposta(pergunta: string, e: Escolha, linhas: Linha[]): Promise<string> {
  if (OLLAMA.fake()) return formatarFake(e, linhas);
  if (linhas.length === 0) return "Não encontrei nada com esses dados.";

  const system = `Respondes ao Daniel, dono da Academia DL-BJJ, em português de Portugal, curto e direto. Recebes a pergunta dele e as LINHAS que a base de dados devolveu. Escreve a resposta SÓ com o que está nas linhas: não acrescentes números, datas, nomes ou factos que não estejam lá. Se as linhas forem uma lista, apresenta-a como lista. Datas no formato dd/mm/aaaa.`;
  try {
    const c = await client().chat.completions.create({
      model: OLLAMA.model(),
      max_tokens: 600,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Pergunta: ${pergunta}\nFerramenta: ${e.ferramenta}\nLinhas (JSON):\n${JSON.stringify(linhas).slice(0, 12_000)}` },
      ],
    });
    return (c.choices[0]?.message?.content ?? "").trim() || formatarFake(e, linhas);
  } catch (err) {
    console.error("[perguntar] formatação falhou", err);
    return formatarFake(e, linhas);
  }
}
