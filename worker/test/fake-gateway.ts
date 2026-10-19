import { createHmac } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Um gateway OpenWA de mentira para os testes: as oito rotas que o transporte
 * usa, mais rotas `/_fake/*` para fazer chegar webhooks ao worker e mudar o
 * comportamento dos envios (aceitar, ficar pendurado, devolver um estado).
 */
export interface SendRecord {
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body: Record<string, unknown>;
  messageId: string | null;
}

export type SendMode = { kind: "ok" } | { kind: "hang"; ms?: number } | { kind: "status"; status: number };

export interface FakeGateway {
  url: string;
  port: number;
  sends: SendRecord[];
  calls: { method: string; path: string }[];
  mode: SendMode;
  session: { status: string; phone: string | null; restriction?: { kind: string; message: string } | null };
  webhooks: { id: string; url: string; events: string[]; secret: string; active: boolean }[];
  /** Entrega um webhook assinado ao URL registado (ou a `target`). */
  emit(event: string, data: unknown, opts?: { target?: string; deliveryId?: string; secret?: string }): Promise<{ status: number }>;
  close(): Promise<void>;
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function lerCorpo(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

export async function startFakeGateway(opts: { apiKey?: string; secret?: string } = {}): Promise<FakeGateway> {
  const apiKey = opts.apiKey ?? "fake-key";
  let n = 0;
  let deliveries = 0;
  const fake: FakeGateway = {
    url: "",
    port: 0,
    sends: [],
    calls: [],
    mode: { kind: "ok" },
    session: { status: "ready", phone: "351925797266", restriction: null },
    webhooks: [],
    emit: async () => ({ status: 0 }),
    close: async () => {},
  };

  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://fake");
    const path = url.pathname;
    fake.calls.push({ method: req.method ?? "", path });

    // ── controlo ──
    if (path.startsWith("/_fake/")) {
      const body = req.method === "POST" ? await lerCorpo(req) : {};
      if (path === "/_fake/mode") {
        fake.mode = body as SendMode;
        return json(res, 200, { ok: true });
      }
      if (path === "/_fake/session") {
        fake.session = { ...fake.session, ...(body as Partial<FakeGateway["session"]>) };
        return json(res, 200, { ok: true });
      }
      if (path === "/_fake/sends") return json(res, 200, fake.sends);
      return json(res, 404, { message: "fake: rota desconhecida" });
    }

    if (req.headers["x-api-key"] !== apiKey) return json(res, 401, { message: "Unauthorized" });

    const m = path.match(/^\/api\/sessions\/([^/]+)(\/.*)?$/);
    if (!m) return json(res, 404, { message: "not found" });
    const sub = m[2] ?? "";

    if (req.method === "GET" && sub === "") {
      return json(res, 200, {
        id: m[1],
        status: fake.session.status,
        phone: fake.session.phone,
        pushName: "DL-BJJ",
        connectedAt: null,
        lastActive: null,
        lastError: null,
        restriction: fake.session.restriction ?? null,
      });
    }
    if (req.method === "GET" && sub === "/qr") {
      return fake.session.status === "qr_ready"
        ? json(res, 200, { qrCode: "data:image/png;base64,AAAA", status: "qr_ready" })
        : json(res, 400, { message: "QR not available" });
    }
    if (req.method === "POST" && sub === "/pairing-code") return json(res, 200, { pairingCode: "ABCD-1234", status: "pairing" });
    if (req.method === "GET" && sub.startsWith("/contacts/check/")) {
      const num = sub.slice("/contacts/check/".length);
      return json(res, 200, { number: num, exists: true, whatsappId: `${num}@c.us` });
    }
    if (sub === "/chats/typing" || sub === "/chats/read") {
      await lerCorpo(req);
      return json(res, 200, { ok: true });
    }
    if (req.method === "GET" && sub === "/webhooks") return json(res, 200, fake.webhooks);
    if (req.method === "POST" && sub === "/webhooks") {
      const body = (await lerCorpo(req)) as { url: string; events: string[]; secret: string };
      const hook = { id: `wh_${fake.webhooks.length + 1}`, url: body.url, events: body.events, secret: body.secret, active: true };
      fake.webhooks.push(hook);
      return json(res, 201, { id: hook.id });
    }
    if (req.method === "PUT" && sub.startsWith("/webhooks/")) {
      const id = sub.slice("/webhooks/".length);
      const body = (await lerCorpo(req)) as { url: string; events: string[]; secret: string; active?: boolean };
      const hook = fake.webhooks.find((w) => w.id === id);
      if (!hook) return json(res, 404, { message: "webhook not found" });
      Object.assign(hook, { url: body.url, events: body.events, secret: body.secret, active: body.active ?? true });
      return json(res, 200, { id });
    }
    if (req.method === "POST" && sub.startsWith("/messages/")) {
      const body = await lerCorpo(req);
      const mode = fake.mode;
      if (mode.kind === "hang") {
        await new Promise((r) => setTimeout(r, mode.ms ?? 60_000));
        if (res.destroyed) return;
      }
      if (mode.kind === "status") {
        fake.sends.push({ path, headers: req.headers, body, messageId: null });
        return json(res, mode.status, { message: `fake: ${mode.status}` });
      }
      n += 1;
      const messageId = `wamid.fake.${n}`;
      fake.sends.push({ path, headers: req.headers, body, messageId });
      return json(res, 201, { messageId, timestamp: Math.floor(Date.now() / 1000) });
    }
    return json(res, 404, { message: `fake: ${req.method} ${path}` });
  });

  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  fake.url = `http://127.0.0.1:${port}`;
  fake.port = port;

  fake.emit = async (event, data, o = {}) => {
    const target = o.target ?? fake.webhooks[0]?.url;
    if (!target) throw new Error("fake: nenhum webhook registado e sem target");
    const secret = o.secret ?? fake.webhooks[0]?.secret ?? opts.secret ?? "";
    deliveries += 1;
    const envelope = {
      event,
      timestamp: new Date().toISOString(),
      sessionId: "s1",
      idempotencyKey: `idem_${deliveries}`,
      deliveryId: o.deliveryId ?? `del_${deliveries}`,
      data,
    };
    const raw = JSON.stringify(envelope);
    const sig = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
    const r = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json", "x-openwa-signature": sig },
      body: raw,
    });
    return { status: r.status };
  };

  fake.close = () =>
    new Promise<void>((resolve) => {
      server.closeAllConnections?.();
      server.close(() => resolve());
    });

  return fake;
}

/** Um IncomingMessage do motor, como o gateway o publica em `message.received`. */
export function mensagemRecebida(o: { phone: string; text: string; id?: string; name?: string; type?: string; lid?: boolean }) {
  const chatId = o.lid ? `123456789012345@lid` : `${o.phone}@c.us`;
  return {
    id: o.id ?? `wamid.in.${Math.random().toString(36).slice(2)}`,
    chatId,
    from: chatId,
    to: "351925797266@c.us",
    body: o.text,
    type: o.type ?? "text",
    timestamp: Math.floor(Date.now() / 1000),
    fromMe: false,
    isGroup: false,
    isStatusBroadcast: false,
    ...(o.lid ? { isLidSender: true, senderPhone: o.phone } : {}),
    contact: { number: o.phone, name: o.name ?? "", pushName: o.name ?? "Teste" },
  };
}
