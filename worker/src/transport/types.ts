/**
 * O vocabulário do transporte. Tudo acima de `transport/openwa.ts` fala isto e
 * nada mais. NÃO existem aqui métodos para subscrever/consultar presença nem
 * para listar contactos (spec §6.13): são assinaturas de bot e ficam de fora
 * para ninguém os acrescentar por distração.
 */
export type ChatId = string; // "351911111111@c.us"
export type TypingState = "typing" | "recording" | "paused";
export type EstadoSessao = "ligado" | "instavel" | "caido";

export interface SentMessage {
  id: string;
  timestamp: number | null;
}

export interface NumberCheck {
  number: string;
  registered: boolean;
  chatId: ChatId | null;
}

export interface SessionSnapshot {
  estado: EstadoSessao;
  motor: string; // o status cru do motor, para o log
  telefone: string | null;
  detalhe: string | null;
  restricao: boolean;
}

export interface WhatsAppTransport {
  sendText(chatId: ChatId, text: string): Promise<SentMessage>;
  setTyping(chatId: ChatId, state: TypingState): Promise<void>;
  markRead(chatId: ChatId): Promise<void>;
  /** A ÚNICA consulta permitida: um número, imediatamente antes do primeiro envio. */
  checkNumber(number: string): Promise<NumberCheck>;
  sessionState(): Promise<SessionSnapshot>;
  qr(): Promise<{ dataUrl: string } | null>;
  pairingCode(phoneNumber: string): Promise<{ code: string }>;
  listWebhooks(): Promise<Array<{ id: string; url: string; events: string[] }>>;
  createWebhook(input: { url: string; events: string[]; secret: string; retryCount?: number }): Promise<{ id: string }>;
  updateWebhook(id: string, input: { url: string; events: string[]; secret: string; retryCount?: number }): Promise<void>;
}
