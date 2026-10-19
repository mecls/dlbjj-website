import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { log } from "../log";
import { EnvelopeSchema } from "./normalize";

/**
 * O único endpoint público do worker: o gateway entrega aqui. A assinatura
 * HMAC-SHA256 é verificada sobre os BYTES recebidos, antes do JSON.parse, em
 * tempo constante. Responde 200 depressa e processa em série numa fila
 * interna; `deliveryId` repetido é ignorado (o gateway reentrega).
 */
export interface WebhookServer {
  url: string;
  port: number;
  close(): Promise<void>;
  /** Resolve quando a fila interna esvazia (para os testes). */
  idle(): Promise<void>;
  pending(): number;
}

export interface WebhookOptions {
  port: number;
  host?: string;
  path: string;
  secret: string;
  onEvent: (event: string, data: unknown) => Promise<void>;
  maxBodyBytes?: number;
  health?: () => Record<string, unknown>;
}

const MAX_BODY = 2 * 1024 * 1024;
const MAX_VISTOS = 10_000;

function verificar(raw: Buffer, header: string | string[] | undefined, secret: string): boolean {
  if (!secret || !header || Array.isArray(header)) return false;
  const esperado = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  const a = Buffer.from(header);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function startWebhookServer(opts: WebhookOptions): Promise<WebhookServer> {
  const max = opts.maxBodyBytes ?? MAX_BODY;
  const vistos = new Set<string>();
  let fila: Promise<void> = Promise.resolve();
  let pendentes = 0;

  function enfileirar(event: string, data: unknown): void {
    pendentes += 1;
    fila = fila
      .then(() => opts.onEvent(event, data))
      .catch((error) => log.error("evento do webhook falhou", { event, error }))
      .finally(() => {
        pendentes -= 1;
      });
  }

  function lerCorpo(req: IncomingMessage): Promise<Buffer | null> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      let total = 0;
      req.on("data", (c: Buffer) => {
        total += c.length;
        if (total > max) {
          resolve(null);
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", () => resolve(null));
    });
  }

  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://worker");
    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, pendentes, ...(opts.health?.() ?? {}) }));
      return;
    }
    if (req.method !== "POST" || url.pathname !== opts.path) {
      res.writeHead(404);
      res.end();
      return;
    }
    const declarado = Number(req.headers["content-length"] ?? 0);
    if (declarado > max) {
      res.writeHead(413);
      res.end();
      return;
    }
    const raw = await lerCorpo(req);
    if (raw === null) {
      if (!res.headersSent) {
        res.writeHead(413);
        res.end();
      }
      return;
    }
    if (!verificar(raw, req.headers["x-openwa-signature"], opts.secret)) {
      log.warn("assinatura do webhook rejeitada", { bytes: raw.length });
      res.writeHead(401);
      res.end();
      return;
    }
    let envelope;
    try {
      envelope = EnvelopeSchema.parse(JSON.parse(raw.toString("utf8")));
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    const chave = envelope.deliveryId ?? envelope.idempotencyKey ?? null;
    if (chave) {
      if (vistos.has(chave)) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end('{"ok":true,"duplicado":true}');
        return;
      }
      vistos.add(chave);
      if (vistos.size > MAX_VISTOS) {
        const primeiro = vistos.values().next().value;
        if (primeiro) vistos.delete(primeiro);
      }
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"ok":true}');
    enfileirar(envelope.event, envelope.data);
  });

  await new Promise<void>((r) => server.listen(opts.port, opts.host ?? "0.0.0.0", r));
  const port = (server.address() as AddressInfo).port;
  const host = opts.host ?? "127.0.0.1";
  return {
    url: `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`,
    port,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
    idle: async () => {
      while (pendentes > 0) await new Promise((r) => setTimeout(r, 10));
    },
    pending: () => pendentes,
  };
}
