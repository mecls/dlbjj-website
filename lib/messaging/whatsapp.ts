import "server-only";
import { GRAPH_API_VERSION, WHATSAPP } from "@/lib/config";
import type { MessagingProvider, OutboundOption } from "./provider";

const GRAPH = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

async function post(body: unknown): Promise<string | null> {
  const res = await fetch(`${GRAPH}/${WHATSAPP.phoneNumberId()}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP.token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[whatsapp] send failed", res.status, text);
    return null;
  }
  const json = (await res.json()) as { messages?: { id: string }[] };
  return json.messages?.[0]?.id ?? null;
}

/**
 * Transporte real da WhatsApp Cloud API. Envia texto livre, botões de resposta
 * (≤3) e listas interativas (≤10) — tudo válido dentro da janela de 24h. Mensagens
 * proativas fora da janela exigem um template aprovado (ver sendTemplate() e
 * lib/messaging/templates.ts).
 */
export const whatsappProvider: MessagingProvider = {
  name: "whatsapp",

  async sendText(to: string, body: string) {
    return post({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    });
  },

  async sendButtons(to: string, body: string, options: OutboundOption[]) {
    return post({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: {
          buttons: options.slice(0, 3).map((o) => ({
            type: "reply",
            reply: { id: o.id, title: o.title.slice(0, 20) },
          })),
        },
      },
    });
  },

  async sendList(
    to: string,
    body: string,
    buttonLabel: string,
    options: OutboundOption[],
  ) {
    return post({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: body },
        action: {
          button: buttonLabel.slice(0, 20),
          sections: [
            {
              rows: options.slice(0, 10).map((o) => ({
                id: o.id,
                title: o.title.slice(0, 24),
                ...(o.description
                  ? { description: o.description.slice(0, 72) }
                  : {}),
              })),
            },
          ],
        },
      },
    });
  },
};

/**
 * Envia um template aprovado (necessário para mensagens iniciadas pelo agente
 * fora da janela de 24h). `components` segue a forma da Cloud API.
 */
export async function sendTemplate(
  to: string,
  name: string,
  components: unknown[],
  language = "pt_PT",
): Promise<string | null> {
  return post({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: { name, language: { code: language }, components },
  });
}

/**
 * Resolve um media id do WhatsApp para um URL temporário e descarrega os bytes.
 * Best-effort: devolve null em falha para o fluxo nunca bloquear em media.
 */
export async function downloadMedia(
  mediaId: string,
): Promise<{ bytes: ArrayBuffer; mimeType: string } | null> {
  try {
    const metaRes = await fetch(`${GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${WHATSAPP.token()}` },
    });
    if (!metaRes.ok) return null;
    const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
    if (!meta.url) return null;
    const binRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${WHATSAPP.token()}` },
    });
    if (!binRes.ok) return null;
    return {
      bytes: await binRes.arrayBuffer(),
      mimeType: meta.mime_type ?? "application/octet-stream",
    };
  } catch (err) {
    console.error("[whatsapp] media download failed", err);
    return null;
  }
}
