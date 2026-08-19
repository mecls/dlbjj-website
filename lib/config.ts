/**
 * Config central + acesso a env. Todos os `process.env` vivem aqui, para o resto
 * do código depender de getters tipados — e a decisão "WhatsApp real vs simulador"
 * ficar num único sítio (`hasWhatsApp()`).
 *
 * (Padrão herdado do waldi-mvp, adaptado à academia DL-BJJ.)
 */

/**
 * LLM de conversa — modelo open-source via Ollama Cloud (endpoint compatível
 * OpenAI). O nome do modelo é editável por env sem tocar em código.
 */
export const OLLAMA = {
  model: () => process.env.OLLAMA_MODEL || "gpt-oss:120b",
  baseUrl: () => process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
  apiKey: () => process.env.OLLAMA_API_KEY || "ollama",
};

export const GRAPH_API_VERSION = "v21.0";

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/**
 * True quando a WhatsApp Cloud API está configurada. Quando é false, o motor
 * envia tudo pelo simulador — o fluxo completo é testável (e demonstrável) sem
 * aprovação da Meta nem números reais.
 */
export function hasWhatsApp(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
  );
}

export const WHATSAPP = {
  token: () => process.env.WHATSAPP_TOKEN || "",
  phoneNumberId: () => process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  verifyToken: () => process.env.WHATSAPP_VERIFY_TOKEN || "",
  appSecret: () => process.env.WHATSAPP_APP_SECRET || "",
};
