import "server-only";
import type { OutboundOption } from "./options";
import { sendOutbound } from "./outbound";
import type { Lead } from "./types";

/** O bot diz algo a uma lead: regista + fila (kind resposta). */
export async function dizer(lead: Lead, texto: string, options: OutboundOption[] = []): Promise<void> {
  await sendOutbound({
    leadId: lead.id,
    to: lead.phone,
    role: "bot",
    body: texto,
    options: options.length ? options : undefined,
  });
}
