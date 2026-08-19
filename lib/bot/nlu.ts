import "server-only";
import OpenAI from "openai";
import { OLLAMA } from "@/lib/config";
import { contactos, horarioFuncionamento, locais, programas } from "@/content/site";
import type { OutboundOption } from "@/lib/messaging/provider";
import type { Lead } from "./types";
import { describeStep } from "./flow";

// Construído preguiçosamente para o `next build` nunca instanciar o SDK sem key.
// A Ollama Cloud expõe um endpoint compatível OpenAI (ver lib/config OLLAMA).
let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client)
    _client = new OpenAI({ baseURL: OLLAMA.baseUrl(), apiKey: OLLAMA.apiKey() });
  return _client;
}

export type NluIntent = "resposta" | "pergunta" | "outro";

export interface NluResult {
  intent: NluIntent;
  /** id de uma das opções do passo atual, quando intent === "resposta". */
  match_id: string | null;
  confidence: number; // 0..1
  /** resposta pt-PT quando intent === "pergunta". */
  answer: string | null;
  needs_human: boolean;
  human_reason: string | null;
}

/**
 * Bloco de FACTOS entregue ao modelo — gerado a partir de content/site.ts para
 * nunca divergir do site. Só contém o que é verdade: modalidades, locais,
 * moradas, horários reais e contactos. Sem preços (não há) e sem bio do professor.
 */
const FACTOS = (() => {
  const mods = programas
    .filter((p) => p.id !== "defesa-pessoal-feminina")
    .map((p) => `${p.nome} (${p.publico})`)
    .join("; ");
  const locaisBloco = locais
    .map((l) => {
      const horarios = l.aulas
        .map((a) => `${a.turma}: ${a.dias} ${a.horario}`)
        .join("; ");
      return `- ${l.nome} — ${l.morada}:\n   ${horarios}`;
    })
    .join("\n");
  return [
    "Academia DL-BJJ (Daniel Lopes) — Jiu-Jitsu brasileiro em Queluz e Amadora. A primeira aula é sempre grátis.",
    `Contactos: telefone ${contactos.telefone}, email ${contactos.email}, Instagram ${contactos.instagramHandle}.`,
    `Modalidades: ${mods}. (Existe também Defesa Pessoal Feminina, mas ainda sem horário fixo — nesses casos, o Daniel confirma.)`,
    "Locais e horários (usa exatamente estes; não inventes outros):",
    locaisBloco,
    `Instalações abertas das ${horarioFuncionamento.abre} às ${horarioFuncionamento.fecha}.`,
  ].join("\n");
})();

const SYSTEM = `És o assistente de inscrições da Academia DL-BJJ (Daniel Lopes), em Portugal. Falas português de Portugal, com tom caloroso, próximo e breve.

Ajudas quem escreve no WhatsApp a marcar a primeira aula grátis, seguindo um guião com opções. A tua função é INTERPRETAR mensagens em texto livre:
- Se a mensagem RESPONDE ao que estamos a perguntar, indica qual das OPÇÕES corresponde ("match_id") e a "confidence" (0 a 1).
- Se a mensagem é uma PERGUNTA (moradas, horários, modalidades, "posso levar o meu filho?", etc.), responde em "answer" usando SÓ os FACTOS abaixo, e mete match_id=null.
- Se for um cumprimento ou conversa irrelevante, intent="outro".
- Se for sensível, uma reclamação, ou não tiveres a certeza, needs_human=true.

REGRAS (nunca quebrar):
- NUNCA inventes preços — não há preços publicados. Se perguntarem, diz que a primeira aula é grátis e que o Daniel confirma os valores diretamente.
- NUNCA inventes a biografia, graduação ou títulos do professor.
- NUNCA inventes aulas, dias ou horários que não estejam nos FACTOS.
- Se não souberes, diz que confirmas com o Daniel. Não inventes.

FACTOS:
${FACTOS}

Responde SEMPRE e APENAS com um objeto JSON válido, sem texto à volta, nesta forma exata:
{"intent":"resposta|pergunta|outro","match_id":"id de uma opção ou null","confidence":0.0,"answer":"texto pt-PT ou null","needs_human":true|false,"human_reason":"motivo ou null"}`;

/**
 * Repara os defeitos habituais de JSON de modelos open-source: blocos de
 * raciocínio, cercas markdown, vírgulas finais e JSON duplamente codificado.
 */
function extractJson(text: string): Record<string, unknown> {
  let cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json in response");
  cleaned = cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
  let parsed: unknown = JSON.parse(cleaned);
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  return parsed as Record<string, unknown>;
}

function normalize(p: Record<string, unknown>): NluResult {
  const s = (v: unknown): string | null =>
    typeof v === "string" && v !== "null" && v.trim() !== "" ? v : null;
  const intent = (["resposta", "pergunta", "outro"] as const).includes(
    p.intent as NluIntent,
  )
    ? (p.intent as NluIntent)
    : "outro";
  let confidence = typeof p.confidence === "number" ? p.confidence : 0;
  if (!Number.isFinite(confidence)) confidence = 0;
  confidence = Math.max(0, Math.min(1, confidence));
  return {
    intent,
    match_id: s(p.match_id),
    confidence,
    answer: s(p.answer),
    needs_human: p.needs_human === true,
    human_reason: s(p.human_reason),
  };
}

/**
 * Interpreta uma mensagem de texto livre no contexto do passo atual. `options`
 * são as opções válidas do passo (vazio quando é só pergunta/conversa).
 */
export async function interpret(
  lead: Lead,
  text: string,
  options: OutboundOption[],
): Promise<NluResult> {
  const opcoes = options.length
    ? options
        .map(
          (o) =>
            `- ${o.id} — ${o.title}${o.description ? ` (${o.description})` : ""}`,
        )
        .join("\n")
    : "Nenhuma (a pessoa está só a falar/perguntar).";

  const userContent = `Passo atual: ${describeStep(lead.step)}.
Opções disponíveis:
${opcoes}

Mensagem da pessoa: "${text}"

Interpreta e responde no formato JSON pedido.`;

  try {
    const completion = await client().chat.completions.create({
      model: OLLAMA.model(),
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    return normalize(extractJson(raw));
  } catch (err) {
    console.error("[nlu] interpret failed", err);
    // Fail-safe: escala para humano em vez de adivinhar.
    return {
      intent: "outro",
      match_id: null,
      confidence: 0,
      answer: null,
      needs_human: true,
      human_reason: "Falha na interpretação automática",
    };
  }
}
