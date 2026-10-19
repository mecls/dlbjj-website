/**
 * O adaptador REST do OpenWA (rmyndharis/OpenWA 0.14.4, motor Baileys) — o
 * ÚNICO ficheiro do worker que sabe que existe um gateway.
 *
 * Factos verificados (ver ARwatches/worker/src/transport/openwa.ts):
 *  · autenticação pelo cabeçalho `X-API-Key` (não é bearer);
 *  · base `/api`, `sessionId` como segmento do caminho;
 *  · um envio responde 201 `{ messageId, timestamp }` — ACEITAÇÃO, não entrega;
 *  · um DM é `<digitos>@c.us`; um `@lid` é um id de privacidade sem número.
 *
 * NADA É REPETIDO AQUI. Um envio que expirou pode ter sido entregue; repetir é
 * uma mensagem duplicada a um cliente sem forma de o saber. A decisão de
 * repetir vive na fila, onde um humano a vê (spec §6.6).
 *
 * Os endpoints de presença e de listagem de contactos NÃO existem de propósito.
 */
import { log, redigirTelefone } from "../log";
import type { ChatId, NumberCheck, SentMessage, SessionSnapshot, TypingState, WhatsAppTransport } from "./types";

export class GatewayError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryable: boolean,
    readonly timedOut = false,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

export interface OpenWaOptions {
  baseUrl: string;
  apiKey: string;
  sessionId: string;
  timeoutMs?: number;
  sendTimeoutMs?: number;
}

export const DEFAULT_TIMEOUT_MS = 15_000;
export const SEND_TIMEOUT_MS = 45_000;

/** "351911111111" → "351911111111@c.us"; um chatId já formado passa igual. */
export function chatIdDe(phoneOuChatId: string): ChatId {
  if (phoneOuChatId.includes("@")) return phoneOuChatId;
  return `${phoneOuChatId.replace(/\D/g, "")}@c.us`;
}

const STATUS_MAP: Record<string, SessionSnapshot["estado"]> = {
  created: "caido",
  initializing: "instavel",
  qr_ready: "caido",
  authenticating: "instavel",
  ready: "ligado",
  action_required: "instavel",
  disconnected: "caido",
  failed: "caido",
};

export class OpenWaTransport implements WhatsAppTransport {
  readonly sessionId: string;
  private readonly base: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly sendTimeoutMs: number;

  constructor(opts: OpenWaOptions) {
    this.sessionId = opts.sessionId;
    this.base = `${opts.baseUrl.replace(/\/+$/, "")}/api`;
    this.apiKey = opts.apiKey;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.sendTimeoutMs = opts.sendTimeoutMs ?? SEND_TIMEOUT_MS;
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT",
    path: string,
    body?: unknown,
    timeoutMs = this.timeoutMs,
  ): Promise<{ status: number; data: T | null }> {
    const url = `${this.base}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          "X-API-Key": this.apiKey,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      const timedOut = cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError");
      throw new GatewayError(
        `${method} ${path} falhou: ${cause instanceof Error ? cause.message : String(cause)}`,
        null,
        true,
        timedOut,
      );
    }
    if (response.status === 204) return { status: 204, data: null };
    const text = await response.text();
    let parsed: unknown = null;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }
    if (!response.ok) {
      const detail =
        parsed && typeof parsed === "object" && "message" in parsed ? String((parsed as { message: unknown }).message) : text.slice(0, 300);
      throw new GatewayError(
        `${method} ${path} → ${response.status}: ${detail}`,
        response.status,
        response.status === 429 || response.status >= 500,
      );
    }
    return { status: response.status, data: parsed as T | null };
  }

  private session(path: string): string {
    return `/sessions/${encodeURIComponent(this.sessionId)}${path}`;
  }

  async sendText(chatId: ChatId, text: string): Promise<SentMessage> {
    const { data } = await this.request<{ messageId: string; timestamp?: number }>(
      "POST",
      this.session("/messages/send-text"),
      { chatId, text },
      this.sendTimeoutMs,
    );
    if (!data?.messageId) throw new GatewayError(`envio para ${redigirTelefone(chatId)} sem messageId`, null, false);
    return { id: data.messageId, timestamp: data.timestamp ?? null };
  }

  /** Cosmético: nunca pode impedir uma resposta de sair. */
  async setTyping(chatId: ChatId, state: TypingState): Promise<void> {
    try {
      await this.request("POST", this.session("/chats/typing"), { chatId, state });
    } catch (error) {
      log.warn("indicador de escrita falhou", { chatId: redigirTelefone(chatId), state, error });
    }
  }

  async markRead(chatId: ChatId): Promise<void> {
    try {
      await this.request("POST", this.session("/chats/read"), { chatId });
    } catch (error) {
      log.warn("recibo de leitura falhou", { chatId: redigirTelefone(chatId), error });
    }
  }

  async checkNumber(number: string): Promise<NumberCheck> {
    const digits = number.replace(/\D/g, "");
    const { data } = await this.request<{ number: string; exists: boolean; whatsappId: string | null }>(
      "GET",
      this.session(`/contacts/check/${encodeURIComponent(digits)}`),
    );
    return { number: data?.number ?? digits, registered: data?.exists ?? false, chatId: data?.whatsappId ?? null };
  }

  async sessionState(): Promise<SessionSnapshot> {
    const { data } = await this.request<{
      status: string;
      phone: string | null;
      lastError: string | null;
      restriction: { kind?: string; message?: string } | null;
    }>("GET", this.session(""));
    const motor = data?.status ?? "failed";
    const restricao = Boolean(data?.restriction);
    const detalhe = restricao
      ? `Restrição do WhatsApp: ${data?.restriction?.message ?? data?.restriction?.kind ?? "conta limitada"}`
      : (data?.lastError ?? null);
    return { estado: STATUS_MAP[motor] ?? "caido", motor, telefone: data?.phone ?? null, detalhe, restricao };
  }

  async qr(): Promise<{ dataUrl: string } | null> {
    try {
      const { data } = await this.request<{ qrCode: string }>("GET", this.session("/qr"));
      return data?.qrCode ? { dataUrl: data.qrCode } : null;
    } catch (error) {
      if (error instanceof GatewayError && error.status === 400) return null;
      throw error;
    }
  }

  async pairingCode(phoneNumber: string): Promise<{ code: string }> {
    const { data } = await this.request<{ pairingCode: string }>("POST", this.session("/pairing-code"), {
      phoneNumber: phoneNumber.replace(/\D/g, ""),
    });
    if (!data?.pairingCode) throw new GatewayError("o gateway não devolveu código de emparelhamento", null, false);
    return { code: data.pairingCode };
  }

  async listWebhooks(): Promise<Array<{ id: string; url: string; events: string[] }>> {
    const { data } = await this.request<Array<{ id: string; url: string; events: string[] }>>("GET", this.session("/webhooks"));
    return data ?? [];
  }

  async createWebhook(input: { url: string; events: string[]; secret: string; retryCount?: number }): Promise<{ id: string }> {
    const { data } = await this.request<{ id: string }>("POST", this.session("/webhooks"), {
      url: input.url,
      events: input.events,
      secret: input.secret,
      retryCount: input.retryCount ?? 3,
    });
    return { id: data?.id ?? "" };
  }

  async updateWebhook(id: string, input: { url: string; events: string[]; secret: string; retryCount?: number }): Promise<void> {
    await this.request("PUT", this.session(`/webhooks/${encodeURIComponent(id)}`), {
      url: input.url,
      events: input.events,
      secret: input.secret,
      active: true,
      retryCount: input.retryCount ?? 3,
    });
  }
}
