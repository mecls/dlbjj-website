import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { startWebhookServer, type WebhookServer } from "../src/inbound/webhook";

let server: WebhookServer;
const recebidos: { event: string; data: unknown }[] = [];
const SECRET = "segredo";

beforeAll(async () => {
  server = await startWebhookServer({
    port: 0,
    path: "/webhooks/openwa",
    secret: SECRET,
    onEvent: async (event, data) => {
      recebidos.push({ event, data });
    },
  });
});
afterAll(async () => {
  await server.close();
});

function entrega(envelope: unknown, secret = SECRET, extra: Record<string, string> = {}) {
  const raw = JSON.stringify(envelope);
  const sig = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  return fetch(`${server.url}/webhooks/openwa`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-openwa-signature": sig, ...extra },
    body: raw,
  });
}

describe("servidor de webhooks", () => {
  it("assinatura errada → 401 e nada processado", async () => {
    const r = await entrega({ event: "message.received", deliveryId: "d1", data: {} }, "outro");
    expect(r.status).toBe(401);
    expect(recebidos).toHaveLength(0);
  });

  it("sem assinatura → 401", async () => {
    const r = await fetch(`${server.url}/webhooks/openwa`, { method: "POST", body: "{}" });
    expect(r.status).toBe(401);
  });

  it("JSON inválido com assinatura certa → 400", async () => {
    const raw = "{nope";
    const sig = `sha256=${createHmac("sha256", SECRET).update(raw).digest("hex")}`;
    const r = await fetch(`${server.url}/webhooks/openwa`, { method: "POST", headers: { "x-openwa-signature": sig }, body: raw });
    expect(r.status).toBe(400);
  });

  it("assinatura certa → 200 e o evento chega ao handler", async () => {
    const r = await entrega({ event: "message.received", deliveryId: "d2", data: { id: "x" } });
    expect(r.status).toBe(200);
    await server.idle();
    expect(recebidos).toEqual([{ event: "message.received", data: { id: "x" } }]);
  });

  it("a mesma deliveryId duas vezes só é processada uma", async () => {
    await entrega({ event: "message.received", deliveryId: "d3", data: { id: "y" } });
    await entrega({ event: "message.received", deliveryId: "d3", data: { id: "y" } });
    await server.idle();
    expect(recebidos.filter((e) => (e.data as { id: string }).id === "y")).toHaveLength(1);
  });

  it("um corpo acima de 2 MB → 413", async () => {
    const raw = JSON.stringify({ event: "x", deliveryId: "big", data: "a".repeat(2_100_000) });
    const sig = `sha256=${createHmac("sha256", SECRET).update(raw).digest("hex")}`;
    const r = await fetch(`${server.url}/webhooks/openwa`, { method: "POST", headers: { "x-openwa-signature": sig }, body: raw });
    expect(r.status).toBe(413);
  });

  it("GET /health responde 200", async () => {
    const r = await fetch(`${server.url}/health`);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true });
  });

  it("outra rota → 404", async () => {
    const r = await fetch(`${server.url}/qualquer`);
    expect(r.status).toBe(404);
  });
});
