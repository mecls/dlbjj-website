/**
 * Config central + acesso a env. Todos os `process.env` da app vivem aqui,
 * para o resto do código depender de getters tipados.
 *
 * O transporte do WhatsApp já não é configurado aqui: a app nunca fala com o
 * gateway. Escreve na fila de saída (dlbjj_fila_saida) e é o worker, na VPS,
 * que envia — ver dlbjj-build-spec.md §6.1 e worker/.
 */

/** Fuso de tudo o que é "hoje", "09:00–21:00" e dia da semana. */
export const TIMEZONE = "Europe/Lisbon";

/**
 * LLM de conversa — modelo open-source via Ollama Cloud (endpoint compatível
 * OpenAI). `OLLAMA_FAKE=1` troca-o por lib/llm/fake.ts (testes e dev sem rede).
 */
export const OLLAMA = {
  model: () => process.env.OLLAMA_MODEL || "gpt-oss:120b",
  baseUrl: () => process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
  apiKey: () => process.env.OLLAMA_API_KEY || "ollama",
  fake: () => process.env.OLLAMA_FAKE === "1",
};

/** A própria app (links públicos) e os segredos partilhados com máquinas. */
export const APP = {
  baseUrl: () => (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/+$/, ""),
  /** Cabeçalho `x-dlbjj-token` do worker → app. */
  workerToken: () => process.env.DLBJJ_WORKER_TOKEN || "",
  /** Bearer dos crons da Vercel e `x-sim-secret` do simulador. */
  cronSecret: () => process.env.CRON_SECRET || "",
};

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/**
 * True quando estamos a servir a sério (produção no Vercel, ou um `next start`).
 *
 * Existe por um motivo só: as conveniências de desenvolvimento deste projeto
 * (painel sem password, simulador aberto, endpoints sem segredo) são portas
 * abertas se chegarem a produção por uma variável esquecida. Com isto, o que em
 * dev é uma conveniência passa a ser uma recusa — falha fechado, não aberto.
 */
export function isProduction(): boolean {
  const vercel = process.env.VERCEL_ENV;
  // Um deploy de PREVIEW na Vercel tem as mesmas chaves que produção; para as
  // portas (painel, simulador, segredos) conta como produção. Só `vercel dev`
  // ("development") e um `next dev` local ficam de fora.
  if (vercel === "production" || vercel === "preview") return true;
  return !vercel && process.env.NODE_ENV === "production";
}
