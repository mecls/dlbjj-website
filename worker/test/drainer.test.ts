import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BACKOFF_MS, drainOnce, libertarTudo, reconciliarInterrompidas, type DrainerDeps } from "../src/outbound/drainer";
import { OpenWaTransport } from "../src/transport/openwa";
import { clearRegistry, isRecentlyOurs } from "../src/inbound/handoff";
import { startFakeGateway, type FakeGateway } from "./fake-gateway";
import { db, FIXTURES, PASSADO, resetDb } from "./helpers";

const sb = db();
let fake: FakeGateway;
let agora = new Date("2026-11-03T10:00:00Z"); // terça 10:00 Lisboa
let deps: DrainerDeps;

async function linha(extra: Record<string, unknown>) {
  const { data: msg } = await sb
    .from("dlbjj_mensagens")
    .insert({ phone: extra.phone as string, direction: "out", role: extra.kind === "humano" ? "humano" : "bot", body: extra.corpo as string, estado: "na_fila" })
    .select("id")
    .single();
  const { data } = await sb
    .from("dlbjj_fila_saida")
    .insert({ enviar_apos: PASSADO(), mensagem_id: msg!.id, ...extra })
    .select("id")
    .single();
  return data!.id as string;
}
async function fila(id: string) {
  const { data } = await sb.from("dlbjj_fila_saida").select("*").eq("id", id).single();
  return data!;
}

beforeAll(async () => {
  resetDb();
  fake = await startFakeGateway({ apiKey: "k" });
  deps = {
    db: sb,
    transport: new OpenWaTransport({ baseUrl: fake.url, apiKey: "k", sessionId: "s1", timeoutMs: 1_000, sendTimeoutMs: 300 }),
    config: { workerId: "w-test", humanizar: false, leaseTtlMs: 10 * 60_000 },
    agora: () => agora,
  };
});
beforeEach(() => {
  fake.mode = { kind: "ok" };
  agora = new Date("2026-11-03T10:00:00Z");
});
afterAll(async () => {
  await fake.close();
});

describe("drenagem da fila", () => {
  it("envia uma resposta: lê, escreve, envia, fecha a linha e a mensagem, conta no orçamento", async () => {
    clearRegistry();
    const id = await linha({ phone: "351911111111", kind: "resposta", corpo: "Olá! 👋" });
    const r = await drainOnce(deps);
    expect(r.enviadas).toBe(1);
    const envio = fake.sends.at(-1)!;
    expect(envio.body).toEqual({ chatId: "351911111111@c.us", text: "Olá! 👋" });
    const f = await fila(id);
    expect(f).toMatchObject({ estado: "enviada", wa_message_id: envio.messageId, tentativas: 1, locked_by: null });
    expect(isRecentlyOurs(envio.messageId!)).toBe(true);
    const { data: m } = await sb.from("dlbjj_mensagens").select("estado,wa_message_id").eq("id", f.mensagem_id).single();
    expect(m).toEqual({ estado: "enviada", wa_message_id: envio.messageId });
    const caminhos = fake.calls.map((c) => c.path);
    const iRead = caminhos.lastIndexOf("/api/sessions/s1/chats/read");
    const iTyping = caminhos.lastIndexOf("/api/sessions/s1/chats/typing");
    const iSend = caminhos.lastIndexOf("/api/sessions/s1/messages/send-text");
    expect(iRead).toBeLessThan(iSend);
    expect(iTyping).toBeLessThan(iSend);
    const { data: o } = await sb.from("dlbjj_orcamento_envio").select("respostas,proativas").eq("dia", "2026-11-03").single();
    expect(o).toEqual({ respostas: 1, proativas: 0 });
  });

  it("um envio que expira fica desconhecido e nunca é repetido (AC-8)", async () => {
    fake.mode = { kind: "hang", ms: 800 };
    const id = await linha({ phone: "351911111112", kind: "resposta", corpo: "x" });
    const antes = fake.sends.length;
    const r = await drainOnce(deps);
    expect(r.desconhecidas).toBe(1);
    expect(await fila(id)).toMatchObject({ estado: "desconhecido", tentativas: 1 });
    fake.mode = { kind: "ok" };
    for (let i = 0; i < 3; i++) await drainOnce(deps);
    expect(await fila(id)).toMatchObject({ estado: "desconhecido", tentativas: 1 });
    expect(fake.sends.length).toBe(antes);
  });

  it("5xx antes de resposta: volta à fila com backoff 30 s → 5 min → 30 min e à 4.ª falha", async () => {
    fake.mode = { kind: "status", status: 503 };
    const id = await linha({ phone: "351911111113", kind: "resposta", corpo: "x" });
    await drainOnce(deps);
    let f = await fila(id);
    expect(f).toMatchObject({ estado: "pendente", tentativas: 1, envio_iniciado_em: null });
    expect(new Date(f.enviar_apos).getTime()).toBe(agora.getTime() + BACKOFF_MS[0]);
    expect(f.erro).toContain("503");

    agora = new Date(agora.getTime() + BACKOFF_MS[0] + 1000);
    await drainOnce(deps);
    f = await fila(id);
    expect(f.tentativas).toBe(2);
    expect(new Date(f.enviar_apos).getTime()).toBe(agora.getTime() + BACKOFF_MS[1]);

    agora = new Date(agora.getTime() + BACKOFF_MS[1] + 1000);
    await drainOnce(deps);
    f = await fila(id);
    expect(f.tentativas).toBe(3);

    agora = new Date(agora.getTime() + BACKOFF_MS[2] + 1000);
    await drainOnce(deps);
    expect(await fila(id)).toMatchObject({ estado: "falhou", tentativas: 4 });
  });

  it("4xx falha logo", async () => {
    fake.mode = { kind: "status", status: 400 };
    const id = await linha({ phone: "351911111114", kind: "resposta", corpo: "x" });
    await drainOnce(deps);
    expect(await fila(id)).toMatchObject({ estado: "falhou", tentativas: 1 });
  });

  it("interruptor desligado: cancela resposta, sistema e proativa, envia a do Daniel (AC-10)", async () => {
    await sb.from("dlbjj_settings").update({ value: "off" }).eq("key", "bot_enabled");
    const ids = {
      resposta: await linha({ phone: "351911111115", kind: "resposta", corpo: "r" }),
      sistema: await linha({ phone: "351911111115", kind: "sistema", corpo: "s" }),
      proativa: await linha({ phone: "351911111115", kind: "proativa", regra: "R4", corpo: "p" }),
      humano: await linha({ phone: "351911111115", kind: "humano", corpo: "h" }),
    };
    const r = await drainOnce(deps);
    await sb.from("dlbjj_settings").update({ value: "on" }).eq("key", "bot_enabled");
    expect(r).toMatchObject({ canceladas: 3, enviadas: 1 });
    for (const k of ["resposta", "sistema", "proativa"] as const) {
      expect(await fila(ids[k])).toMatchObject({ estado: "cancelada", erro: "interruptor desligado" });
    }
    expect(await fila(ids.humano)).toMatchObject({ estado: "enviada" });
  });

  it("fora da janela, uma proativa é adiada para as 09:00 seguintes sem sair", async () => {
    agora = new Date("2026-11-03T21:30:00Z");
    const id = await linha({ phone: "351911111116", kind: "proativa", regra: "R4", corpo: "p" });
    const antes = fake.sends.length;
    const r = await drainOnce(deps);
    expect(r.adiadas).toBe(1);
    const f = await fila(id);
    expect(f).toMatchObject({ estado: "pendente", locked_by: null, tentativas: 0 });
    expect(f.enviar_apos).toBe("2026-11-04T09:00:00+00:00");
    expect(fake.sends.length).toBe(antes);
    agora = new Date("2026-11-04T09:05:00Z");
    await drainOnce(deps);
    expect(await fila(id)).toMatchObject({ estado: "enviada" });
  });

  it("com o teto do dia atingido, a proativa espera pelo dia seguinte", async () => {
    await sb.from("dlbjj_orcamento_envio").upsert({ dia: "2026-11-03", proativas: 10 });
    const id = await linha({ phone: "351911111117", kind: "proativa", regra: "R4", corpo: "p" });
    await drainOnce(deps);
    const f = await fila(id);
    expect(f.estado).toBe("pendente");
    expect(f.enviar_apos).toBe("2026-11-04T09:00:00+00:00");
    await sb.from("dlbjj_orcamento_envio").upsert({ dia: "2026-11-03", proativas: 0 });
  });

  it("uma proativa enviada marca o toque e conta no orçamento", async () => {
    const id = await linha({ phone: FIXTURES.leads.concluido.phone, kind: "proativa", regra: "R3", corpo: "Olá Carla!" });
    await sb.from("dlbjj_toques").insert({ phone: FIXTURES.leads.concluido.phone, lead_id: FIXTURES.leads.concluido.id, regra: "R3", fila_id: id });
    await drainOnce(deps);
    const { data: t } = await sb.from("dlbjj_toques").select("estado,enviada_em").eq("fila_id", id).single();
    expect(t!.estado).toBe("enviada");
    expect(t!.enviada_em).not.toBeNull();
    const { data: o } = await sb.from("dlbjj_orcamento_envio").select("proativas").eq("dia", "2026-11-03").single();
    expect(o!.proativas).toBe(1);
  });

  it("um lease expirado de outro worker é reclamado", async () => {
    const id = await linha({ phone: "351911111118", kind: "resposta", corpo: "x", estado: "a_enviar", locked_by: "morto", locked_at: new Date(agora.getTime() - 11 * 60_000).toISOString() });
    await drainOnce(deps);
    expect(await fila(id)).toMatchObject({ estado: "enviada" });
  });

  it("no arranque, um envio interrompido a meio fica desconhecido", async () => {
    const id = await linha({ phone: "351911111119", kind: "resposta", corpo: "x", estado: "a_enviar", locked_by: "morto", locked_at: PASSADO(), envio_iniciado_em: PASSADO() });
    const n = await reconciliarInterrompidas(deps);
    expect(n).toBe(1);
    expect(await fila(id)).toMatchObject({ estado: "desconhecido" });
  });

  it("ao parar, as linhas reclamadas e ainda não enviadas voltam à fila", async () => {
    const id = await linha({ phone: "351911111120", kind: "resposta", corpo: "x", estado: "a_enviar", locked_by: "w-test", locked_at: PASSADO() });
    const n = await libertarTudo(deps);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(await fila(id)).toMatchObject({ estado: "pendente", locked_by: null });
  });
});
