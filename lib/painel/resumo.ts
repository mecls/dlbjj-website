import "server-only";
import OpenAI from "openai";
import { OLLAMA } from "@/lib/config";
import { extractJson } from "@/lib/bot/nlu";
import { resumoFake } from "@/lib/llm/fake";
import { serviceClient } from "@/lib/supabase/service";

/**
 * O resumo de uma conversa (ajustes §2.3): a pedido do Daniel, o modelo lê o
 * fio (os dois lados, com códigos de login e links com token escondidos) e
 * escreve duas frases: onde está a conversa e o que a pessoa quer. Guarda-se
 * em dlbjj_resumos, nunca na lead.
 */
export const MAX_MENSAGENS = 60;
const MAX_SITUACAO = 240;
const MAX_QUER = 160;

/** Esconde códigos de login (*123456*) e links com token antes de o texto sair para o modelo. */
export function redigir(body: string): string {
  return body.replace(/\*\d{4,8}\*/g, "*[código]*").replace(/\/(inscricao|aluno)\/[A-Za-z0-9_-]{20,}/g, "/$1/[link]");
}

export interface Resumo {
  situacao: string;
  quer: string;
}

/** Puro: o JSON do modelo → {situacao, quer}, cortado ao tamanho; qualquer outra coisa → null. */
export function extrairResumo(text: string): Resumo | null {
  let obj: Record<string, unknown>;
  try {
    obj = extractJson(text);
  } catch {
    return null;
  }
  const situacao = typeof obj.situacao === "string" ? obj.situacao.trim() : "";
  const quer = typeof obj.quer === "string" ? obj.quer.trim() : "";
  if (!situacao || !quer) return null;
  return { situacao: situacao.slice(0, MAX_SITUACAO), quer: quer.slice(0, MAX_QUER) };
}

export interface ResumoRow extends Resumo {
  lead_id: string;
  mensagens: number;
  ate: string;
  em: string;
}

export type ResultadoResumo = "ok" | "sem_conversa" | "resumo";

const SYSTEM = `És o assistente do painel da Academia DL-BJJ (jiu-jitsu, Portugal). Lês uma conversa de WhatsApp entre uma pessoa interessada («Cliente»), o bot da academia («Assistente») e o professor Daniel («Daniel»), e escreves, em português de Portugal, um resumo curto para o Daniel.
Responde SÓ com JSON: {"situacao": "...", "quer": "..."}.
- "situacao": onde está a conversa neste momento, em 1 ou 2 frases (máximo 240 caracteres). Factos da conversa, sem inventar.
- "quer": o que a pessoa quer, numa frase (máximo 160 caracteres).`;

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) _client = new OpenAI({ baseURL: OLLAMA.baseUrl(), apiKey: OLLAMA.apiKey() });
  return _client;
}

const PAPEL: Record<string, string> = { lead: "Cliente", bot: "Assistente", humano: "Daniel" };

async function pedirAoModelo(linhas: string[], ultimaDoCliente: string): Promise<string> {
  if (OLLAMA.fake()) return resumoFake(ultimaDoCliente);
  const completion = await client().chat.completions.create({
    model: OLLAMA.model(),
    max_tokens: 400,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Conversa (da mais antiga para a mais recente):\n\n${linhas.join("\n")}\n\nEscreve o JSON.` },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

/** Lê as últimas MAX_MENSAGENS mensagens do telemóvel, pede o resumo e guarda-o. */
export async function gerarResumo(leadId: string, phone: string): Promise<ResultadoResumo> {
  const db = serviceClient();
  const { data } = await db
    .from("dlbjj_mensagens")
    .select("role,body,created_at")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(MAX_MENSAGENS);
  const rows = ((data ?? []) as { role: string; body: string; created_at: string }[]).reverse();
  if (!rows.some((r) => r.role === "lead" || r.role === "humano")) return "sem_conversa";

  const linhas = rows.map((r) => `${PAPEL[r.role] ?? r.role}: ${redigir(r.body)}`);
  const ultimaDoCliente = redigir([...rows].reverse().find((r) => r.role === "lead")?.body ?? "");
  let texto = "";
  try {
    texto = await pedirAoModelo(linhas, ultimaDoCliente);
  } catch (err) {
    console.error("[resumo] modelo falhou", err);
    return "resumo";
  }
  const resumo = extrairResumo(texto);
  if (!resumo) return "resumo";

  const { error } = await db.from("dlbjj_resumos").upsert(
    { lead_id: leadId, ...resumo, mensagens: rows.length, ate: rows[rows.length - 1].created_at, em: new Date().toISOString() },
    { onConflict: "lead_id" },
  );
  if (error) {
    console.error("[resumo] não guardou", error);
    return "resumo";
  }
  return "ok";
}

/** O resumo guardado e se já há conversa depois dele. */
export async function lerResumo(leadId: string, ultimaMensagemEm: string | null): Promise<{ resumo: ResumoRow | null; desatualizado: boolean }> {
  const { data } = await serviceClient().from("dlbjj_resumos").select("lead_id,situacao,quer,mensagens,ate,em").eq("lead_id", leadId).maybeSingle();
  const resumo = (data as ResumoRow | null) ?? null;
  const desatualizado = Boolean(resumo && ultimaMensagemEm && new Date(ultimaMensagemEm).getTime() > new Date(resumo.ate).getTime());
  return { resumo, desatualizado };
}
