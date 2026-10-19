import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarDispatcher } from "../src/dispatch";
import { startWebhookServer, type WebhookServer } from "../src/inbound/webhook";
import { drainOnce, type DrainerDeps } from "../src/outbound/drainer";
import { heartbeat } from "../src/scheduler/heartbeat";
import { OpenWaTransport } from "../src/transport/openwa";
import { mensagemRecebida, startFakeGateway, type FakeGateway } from "./fake-gateway";
import { db, FIXTURES, resetDb, startStubApp, type StubApp } from "./helpers";

const sb = db();
let fake: FakeGateway;
let app: StubApp;
let worker: WebhookServer;
let deps: DrainerDeps;
const SECRET = "whs";

beforeAll(async () => {
  resetDb();
  fake = await startFakeGateway({ apiKey: "k" });
  app = await startStubApp();
  // O "cérebro" de mentira: a cada mensagem recebida, põe uma resposta na fila.
  app.onInbound = async (body) => {
    await sb.from("dlbjj_fila_saida").insert({ phone: body.from, kind: "resposta", corpo: `Resposta a: ${body.text}` });
  };
  const transport = new OpenWaTransport({ baseUrl: fake.url, apiKey: "k", sessionId: "s1", timeoutMs: 1_000, sendTimeoutMs: 1_000 });
  deps = { db: sb, transport, config: { workerId: "w-rt", humanizar: false, leaseTtlMs: 600_000 }, agora: () => new Date(Date.now()) };
  const dispatch = criarDispatcher({ db: sb, transport, appBaseUrl: app.url, token: "tok", timeoutMs: 2_000, pausaHoras: 24 });
  worker = await startWebhookServer({ port: 0, host: "127.0.0.1", path: "/webhooks/openwa", secret: SECRET, onEvent: dispatch, health: () => ({ descartadas: dispatch.descartadas() }) });
  await transport.createWebhook({ url: `${worker.url}/webhooks/openwa`, events: ["message.received", "message.sent", "session.restriction", "session.status"], secret: SECRET });
});
afterAll(async () => {
  await worker.close();
  await app.close();
  await fake.close();
});

describe("Jornada H — da mensagem recebida à resposta enviada", () => {
  it("gateway → worker → app → fila → worker → gateway", async () => {
    const phone = "351900000901";
    await fake.emit("message.received", mensagemRecebida({ phone, text: "Olá", id: "wamid.in.1", name: "Zé" }));
    await worker.idle();
    expect(app.pedidos.at(-1)!.body).toEqual({ from: phone, text: "Olá", waMessageId: "wamid.in.1", name: "Zé" });

    // A linha que o "cérebro" pôs na fila pode ter enviar_apos uns ms à frente do relógio do host.
    deps.agora = () => new Date(Date.now() + 5_000);
    const r = await drainOnce(deps);
    expect(r.enviadas).toBe(1);
    expect(fake.sends.at(-1)!.body).toEqual({ chatId: `${phone}@c.us`, text: "Resposta a: Olá" });
    const { data: o } = await sb.from("dlbjj_orcamento_envio").select("recebidas,respostas").order("dia", { ascending: false }).limit(1).single();
    expect(o).toMatchObject({ recebidas: 1, respostas: 1 });
  });

  it("o eco do nosso próprio envio não pausa ninguém", async () => {
    const phone = "351900000901";
    const nosso = fake.sends.at(-1)!.messageId!;
    await fake.emit("message.sent", { ...mensagemRecebida({ phone, text: "Resposta a: Olá", id: nosso }), fromMe: true });
    await worker.idle();
    const { data: lead } = await sb.from("dlbjj_leads").select("paused").eq("phone", phone).maybeSingle();
    expect(lead?.paused ?? false).toBe(false);
  });

  it("um eco com id desconhecido pausa a lead em menos de 2 s (AC-3)", async () => {
    const { phone, id } = FIXTURES.leads.emProgresso;
    const t0 = Date.now();
    await fake.emit("message.sent", { ...mensagemRecebida({ phone, text: "Sou o Daniel", id: "wamid.unknown-1" }), fromMe: true });
    await worker.idle();
    const { data: lead } = await sb.from("dlbjj_leads").select("paused,status,human_reason").eq("id", id).single();
    expect(Date.now() - t0).toBeLessThan(2_000);
    expect(lead).toMatchObject({ paused: true, status: "humano", human_reason: "Daniel respondeu pelo telemóvel" });
    const { data: m } = await sb.from("dlbjj_mensagens").select("role,direction").eq("wa_message_id", "wamid.unknown-1").single();
    expect(m).toEqual({ role: "humano", direction: "out" });
  });

  it("um payload que o worker não percebe é contado e aparece no /health (I13)", async () => {
    const n = app.pedidos.length;
    await fake.emit("message.received", { id: 1, isto: "não é uma mensagem" });
    await fake.emit("message.received", { ...mensagemRecebida({ phone: "351900000903", text: "x", lid: true }), senderPhone: null, contact: undefined });
    await worker.idle();
    expect(app.pedidos.length).toBe(n);
    const saude = (await (await fetch(`${worker.url}/health`)).json()) as { descartadas?: Record<string, number> };
    expect(saude.descartadas).toMatchObject({ "payload inválido": 1, "sem telefone (@lid)": 1 });
    await heartbeat({ db: sb, transport: deps.transport, descartadas: () => saude.descartadas ?? {} });
    const { data: s } = await sb.from("dlbjj_sessao").select("detalhe").eq("id", 1).single();
    expect(s!.detalhe).toContain("2 entradas descartadas");
  });

  it("um message.received com o id de um envio nosso não volta a entrar na app (guarda contra ciclos)", async () => {
    const n = app.pedidos.length;
    const nosso = fake.sends.at(-1)!.messageId!;
    await fake.emit("message.received", mensagemRecebida({ phone: "351900000901", text: "Resposta a: Olá", id: nosso }));
    await worker.idle();
    expect(app.pedidos.length).toBe(n);
  });

  it("grupos nunca chegam à app", async () => {
    const n = app.pedidos.length;
    await fake.emit("message.received", { ...mensagemRecebida({ phone: "351900000902", text: "x" }), isGroup: true, chatId: "1234-5678@g.us" });
    await worker.idle();
    expect(app.pedidos.length).toBe(n);
  });

  it("uma restrição do WhatsApp trava as proativas por uma hora", async () => {
    await fake.emit("session.restriction", { kind: "rate_limited", message: "limited" });
    await worker.idle();
    const { data: s } = await sb.from("dlbjj_sessao").select("restricao_ate").eq("id", 1).single();
    const ate = new Date(s!.restricao_ate).getTime();
    expect(ate).toBeGreaterThan(Date.now() + 55 * 60_000);
    expect(ate).toBeLessThan(Date.now() + 65 * 60_000);
  });

  it("o heartbeat escreve o estado da sessão sem apagar a restrição", async () => {
    await heartbeat({ db: sb, transport: deps.transport, descartadas: () => ({}) });
    const { data: s } = await sb.from("dlbjj_sessao").select("estado,telefone,visto_em,restricao_ate").eq("id", 1).single();
    expect(s).toMatchObject({ estado: "ligado", telefone: "351925797266" });
    expect(s!.restricao_ate).not.toBeNull();
    fake.session.status = "disconnected";
    await heartbeat({ db: sb, transport: deps.transport });
    const { data: s2 } = await sb.from("dlbjj_sessao").select("estado").eq("id", 1).single();
    expect(s2!.estado).toBe("caido");
    fake.session.status = "ready";
  });
});
