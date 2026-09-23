import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { isProduction, WHATSAPP } from "@/lib/config";
import type { InboundMessage } from "@/lib/messaging/provider";
import { handleInbound } from "@/lib/bot/handle-inbound";

export const runtime = "nodejs";

// ─── GET: verificação do webhook (a Meta subscreve aqui) ───
export function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const expected = WHATSAPP.verifyToken();
  // Sem token configurado nunca se aceita: senão `hub.verify_token=` (vazio)
  // bateria certo e qualquer pessoa validaria o webhook.
  if (expected && mode === "subscribe" && token === expected) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function verifySignature(raw: string, header: string | null): boolean {
  const secret = WHATSAPP.appSecret();
  if (!secret) {
    // Em dev, sem segredo, aceita-se para o simulador poder trabalhar. Em
    // produção isso seria um webhook aberto a quem descobrisse o URL — e o
    // sintoma seria o bot a conversar com desconhecidos, não um erro.
    return !isProduction();
  }
  if (!header) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ─── POST: mensagens recebidas ───
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const inbound = normalize(payload);
  // A Meta exige um 200 rápido. Processamos sequencialmente (volume baixo); a
  // dedupe por wa_message_id garante que uma reentrega não duplica a inscrição.
  for (const msg of inbound) {
    try {
      await handleInbound(msg);
    } catch (err) {
      console.error("[webhook] handleInbound failed", err);
    }
  }
  return NextResponse.json({ ok: true });
}

// ─── Normalizar o payload da Cloud API para InboundMessage[] ───
interface WebhookPayload {
  entry?: {
    changes?: {
      field?: string;
      value?: {
        contacts?: { profile?: { name?: string }; wa_id?: string }[];
        messages?: WaMessage[];
      };
    }[];
  }[];
}

interface WaMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  interactive?: {
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
  image?: { id: string; caption?: string };
  audio?: { id: string };
}

function normalize(payload: WebhookPayload): InboundMessage[] {
  const out: InboundMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages) {
        // A auto-pausa da Coexistence (o bot calar-se quando o Daniel responde
        // pelo telemóvel) depende de saber o nome exato do campo de eco, e a
        // documentação da Meta muda. Registar o que chega é a forma de o
        // descobrir com evidência em vez de adivinhar — ver docs/PRE-VOO.md,
        // Fase 6.
        if (change.field && change.field !== "messages") {
          console.log("[webhook] campo não tratado:", change.field);
        }
        continue;
      }
      const nameByWaId = new Map<string, string>();
      for (const c of value.contacts ?? []) {
        if (c.wa_id && c.profile?.name) nameByWaId.set(c.wa_id, c.profile.name);
      }
      for (const m of value.messages) {
        const base: InboundMessage = {
          from: m.from,
          waMessageId: m.id,
          text: "",
          name: nameByWaId.get(m.from),
        };
        if (m.type === "text") {
          base.text = m.text?.body ?? "";
        } else if (m.type === "interactive") {
          const reply = m.interactive?.button_reply ?? m.interactive?.list_reply;
          base.buttonId = reply?.id;
          base.text = reply?.title ?? "";
        } else if (m.type === "image") {
          base.text = m.image?.caption || "[foto recebida]";
        } else if (m.type === "audio") {
          base.text = "[áudio] — podes escrever por texto, por favor?";
        } else {
          base.text = "[mensagem não suportada]";
        }
        out.push(base);
      }
    }
  }
  return out;
}
