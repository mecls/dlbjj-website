import { z } from "zod";

/**
 * O payload do gateway → o nosso vocabulário. Camada anti-corrupção parseada
 * DEFENSIVAMENTE: isto chega pela rede de um processo que não controlamos.
 * Chaves desconhecidas são ignoradas (o gateway acrescenta campos entre
 * versões; um worker que rejeita um campo novo é um worker que pára de
 * receber no dia em que alguém o atualiza).
 */
export const EnvelopeSchema = z.object({
  event: z.string(),
  timestamp: z.string().optional(),
  sessionId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  deliveryId: z.string().optional(),
  data: z.unknown(),
});
export type Envelope = z.infer<typeof EnvelopeSchema>;

const IncomingSchema = z.object({
  id: z.string(),
  chatId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  body: z.string().optional().nullable(),
  type: z.string().optional(),
  timestamp: z.number().optional(),
  fromMe: z.boolean().optional(),
  isGroup: z.boolean().optional(),
  isStatusBroadcast: z.boolean().optional(),
  isLidSender: z.boolean().optional(),
  senderPhone: z.string().nullable().optional(),
  contact: z
    .object({
      number: z.string().optional(),
      name: z.string().optional(),
      pushName: z.string().optional(),
    })
    .optional(),
  media: z.object({ mimetype: z.string().optional() }).optional(),
});

export type Entrada =
  | { kind: "mensagem"; phone: string; chatId: string; text: string; id: string; name?: string }
  | { kind: "eco"; id: string; phone: string | null; chatId: string; text: string }
  | { kind: "descartar"; motivo: string };

/** Dígitos de um id do gateway ("351911111111@c.us" → "351911111111"); null para @lid. */
export function telefoneDe(id: string | null | undefined): string | null {
  if (!id) return null;
  if (id.endsWith("@lid")) return null;
  const local = id.includes("@") ? id.slice(0, id.indexOf("@")) : id;
  const digitos = local.replace(/\D/g, "");
  return digitos || null;
}

function textoDe(m: z.infer<typeof IncomingSchema>): string {
  const corpo = (m.body ?? "").trim();
  switch (m.type ?? "text") {
    case "text":
    case "chat":
      return corpo;
    case "image":
      return corpo || "[foto recebida]";
    case "audio":
    case "voice":
    case "ptt":
      return "[áudio]"; // a app responde "podes escrever por texto" sem passar pelo modelo
    default:
      return corpo || "[mensagem não suportada]";
  }
}

export function normalizarEntrada(data: unknown): Entrada {
  const parsed = IncomingSchema.safeParse(data);
  if (!parsed.success) return { kind: "descartar", motivo: "payload inválido" };
  const m = parsed.data;
  if (m.isGroup) return { kind: "descartar", motivo: "grupo" };
  if (m.isStatusBroadcast) return { kind: "descartar", motivo: "estado" };

  const chatId = m.chatId ?? m.from ?? "";
  const phone = m.senderPhone?.replace(/\D/g, "") || telefoneDe(chatId) || m.contact?.number?.replace(/\D/g, "") || null;

  if (m.fromMe) return { kind: "eco", id: m.id, phone: telefoneDe(chatId) ?? phone, chatId, text: (m.body ?? "").trim() };
  if (!phone) return { kind: "descartar", motivo: "sem telefone (@lid)" };

  const name = m.contact?.pushName || m.contact?.name || undefined;
  return { kind: "mensagem", phone, chatId, text: textoDe(m), id: m.id, ...(name ? { name } : {}) };
}
