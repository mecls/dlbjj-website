import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GatewayError, OpenWaTransport } from "../src/transport/openwa";
import { startFakeGateway, type FakeGateway } from "./fake-gateway";

let fake: FakeGateway;
let t: OpenWaTransport;

beforeAll(async () => {
  fake = await startFakeGateway({ apiKey: "k" });
  t = new OpenWaTransport({ baseUrl: fake.url, apiKey: "k", sessionId: "s1", timeoutMs: 1_000, sendTimeoutMs: 400 });
});
afterAll(async () => {
  await fake.close();
});

describe("OpenWaTransport", () => {
  it("envia texto com X-API-Key e devolve o messageId", async () => {
    const r = await t.sendText("351911111111@c.us", "olá");
    expect(r.id).toBe("wamid.fake.1");
    const s = fake.sends.at(-1)!;
    expect(s.path).toBe("/api/sessions/s1/messages/send-text");
    expect(s.headers["x-api-key"]).toBe("k");
    expect(s.body).toEqual({ chatId: "351911111111@c.us", text: "olá" });
  });

  it("um envio que não responde a tempo falha como timedOut (e NUNCA é repetido aqui)", async () => {
    fake.mode = { kind: "hang", ms: 2_000 };
    const antes = fake.sends.length;
    await expect(t.sendText("351911111111@c.us", "x")).rejects.toMatchObject({ name: "GatewayError", timedOut: true, retryable: true });
    fake.mode = { kind: "ok" };
    expect(fake.sends.length).toBe(antes); // o fake só regista quando responde — e não respondeu
  });

  it("429 é retryable, 400 não é", async () => {
    fake.mode = { kind: "status", status: 429 };
    await expect(t.sendText("351911111111@c.us", "x")).rejects.toMatchObject({ status: 429, retryable: true, timedOut: false });
    fake.mode = { kind: "status", status: 400 };
    await expect(t.sendText("351911111111@c.us", "x")).rejects.toMatchObject({ status: 400, retryable: false });
    fake.mode = { kind: "ok" };
  });

  it("qr() devolve null quando a sessão já está emparelhada", async () => {
    expect(await t.qr()).toBeNull();
    fake.session.status = "qr_ready";
    expect(await t.qr()).toMatchObject({ dataUrl: expect.stringContaining("data:image/png") });
    fake.session.status = "ready";
  });

  it("mapeia os estados do motor para ligado / instavel / caido", async () => {
    const casos: [string, string][] = [
      ["ready", "ligado"],
      ["qr_ready", "caido"],
      ["disconnected", "caido"],
      ["action_required", "instavel"],
      ["initializing", "instavel"],
      ["failed", "caido"],
    ];
    for (const [motor, nosso] of casos) {
      fake.session.status = motor;
      expect((await t.sessionState()).estado, motor).toBe(nosso);
    }
    fake.session.status = "ready";
  });

  it("uma restrição do WhatsApp aparece no detalhe", async () => {
    fake.session.restriction = { kind: "rate_limited", message: "Account temporarily restricted" };
    const s = await t.sessionState();
    expect(s.detalhe).toContain("Restrição do WhatsApp");
    expect(s.restricao).toBe(true);
    fake.session.restriction = null;
  });

  it("checkNumber limpa o número e devolve o chatId", async () => {
    const r = await t.checkNumber("+351 911 111 111");
    expect(r).toEqual({ number: "351911111111", registered: true, chatId: "351911111111@c.us" });
  });

  it("indicador de escrita e recibo de leitura nunca lançam", async () => {
    fake.mode = { kind: "status", status: 500 };
    await expect(t.setTyping("351911111111@c.us", "typing")).resolves.toBeUndefined();
    await expect(t.markRead("351911111111@c.us")).resolves.toBeUndefined();
    fake.mode = { kind: "ok" };
  });

  it("regista o webhook e reescreve-o quando já existe", async () => {
    const { id } = await t.createWebhook({ url: "http://w:4001/webhooks/openwa", events: ["message.received"], secret: "s" });
    expect(id).toBe("wh_1");
    await t.updateWebhook(id, { url: "http://w:4001/webhooks/openwa", events: ["message.received", "message.sent"], secret: "s2" });
    const lista = await t.listWebhooks();
    expect(lista[0]).toMatchObject({ id: "wh_1", events: ["message.received", "message.sent"] });
  });

  it("não tem presença nem listagem de contactos (spec §6.13)", () => {
    // @ts-expect-error — método proibido, não existe no transporte
    expect(t.subscribePresence).toBeUndefined();
    // @ts-expect-error — método proibido, não existe no transporte
    expect(t.listContacts).toBeUndefined();
    expect(GatewayError.name).toBe("GatewayError");
  });

  it("chatIdDe transforma dígitos em <digitos>@c.us", async () => {
    const { chatIdDe } = await import("../src/transport/openwa");
    expect(chatIdDe("351911111111")).toBe("351911111111@c.us");
    expect(chatIdDe("351911111111@c.us")).toBe("351911111111@c.us");
  });
});
