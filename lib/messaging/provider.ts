import { hasWhatsApp } from "@/lib/config";
import { whatsappProvider } from "./whatsapp";
import { simulatorProvider } from "./simulator";

/**
 * Uma opção escolhível (botão de resposta ou linha de lista interativa do
 * WhatsApp). `description` só é usado nas listas.
 */
export interface OutboundOption {
  id: string;
  title: string; // ≤20 (botões) / ≤24 (linhas de lista) — cortado no transporte
  description?: string; // só lista, ≤72
}

/**
 * Mensagem que chega do WhatsApp real (webhook) ou do simulador, normalizada
 * numa só forma que o motor entende.
 */
export interface InboundMessage {
  from: string; // E.164 só dígitos, sem '+'
  text: string; // texto livre, ou o título do botão premido
  buttonId?: string; // id da resposta interativa, quando foi premido um botão/lista
  mediaUrl?: string;
  waMessageId?: string;
  name?: string; // nome de perfil do WhatsApp, se disponível
}

/**
 * O transporte da conversa. Duas implementações: a WhatsApp Cloud API real e o
 * simulador. O motor só fala com esta interface — trocar de transporte não muda
 * nada a montante.
 */
export interface MessagingProvider {
  name: "whatsapp" | "simulator";
  /** Devolve o id da mensagem no provider (ou null no simulador). */
  sendText(to: string, body: string): Promise<string | null>;
  sendButtons(
    to: string,
    body: string,
    options: OutboundOption[],
  ): Promise<string | null>;
  sendList(
    to: string,
    body: string,
    buttonLabel: string,
    options: OutboundOption[],
  ): Promise<string | null>;
}

/** Escolhe o transporte real quando o WhatsApp está configurado, senão o simulador. */
export function getProvider(): MessagingProvider {
  return hasWhatsApp() ? whatsappProvider : simulatorProvider;
}
