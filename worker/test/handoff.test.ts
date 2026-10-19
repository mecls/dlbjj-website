import { beforeAll, describe, expect, it } from "vitest";
import { applyHandoff, clearRegistry, isRecentlyOurs, rememberOurSend } from "../src/inbound/handoff";
import { db, FIXTURES, resetDb } from "./helpers";

const sb = db();

beforeAll(() => {
  resetDb();
  clearRegistry();
});

describe("passagem de mão (Daniel escreve pelo telemóvel)", () => {
  it("o eco de um envio nosso é ignorado", async () => {
    rememberOurSend("wamid.nosso.1");
    expect(isRecentlyOurs("wamid.nosso.1")).toBe(true);
    const r = await applyHandoff(sb, { id: "wamid.nosso.1", phone: FIXTURES.leads.emProgresso.phone, chatId: `${FIXTURES.leads.emProgresso.phone}@c.us`, text: "x" }, 24);
    expect(r).toBe("ignorado");
    const { data } = await sb.from("dlbjj_leads").select("paused").eq("id", FIXTURES.leads.emProgresso.id).single();
    expect(data!.paused).toBe(false);
  });

  it("um id desconhecido pausa a lead por 24 h e guarda a mensagem como do Daniel", async () => {
    const { phone, id } = FIXTURES.leads.emProgresso;
    const antes = Date.now();
    const r = await applyHandoff(sb, { id: "wamid.unknown-1", phone, chatId: `${phone}@c.us`, text: "Olá, é o Daniel" }, 24);
    expect(r).toBe("pausado");
    const { data: lead } = await sb.from("dlbjj_leads").select("paused,status,human_reason,humano_ate").eq("id", id).single();
    expect(lead).toMatchObject({ paused: true, status: "humano", human_reason: "Daniel respondeu pelo telemóvel" });
    const ate = new Date(lead!.humano_ate).getTime();
    expect(ate).toBeGreaterThan(antes + 23.9 * 3_600_000);
    expect(ate).toBeLessThan(antes + 24.1 * 3_600_000);
    const { data: msg } = await sb.from("dlbjj_mensagens").select("direction,role,body,wa_message_id,estado").eq("wa_message_id", "wamid.unknown-1").single();
    expect(msg).toMatchObject({ direction: "out", role: "humano", body: "Olá, é o Daniel", estado: "enviada" });
  });

  it("depois de um reinício (registo vazio), a base de dados é o apoio", async () => {
    const { phone } = FIXTURES.leads.concluido;
    await sb.from("dlbjj_fila_saida").insert({ phone, kind: "resposta", corpo: "x", estado: "enviada", wa_message_id: "wamid.na-bd" });
    clearRegistry();
    const r = await applyHandoff(sb, { id: "wamid.na-bd", phone, chatId: `${phone}@c.us`, text: "x" }, 24);
    expect(r).toBe("ignorado");
  });

  it("um eco que chega ANTES de o envio responder (linha a_enviar com envio iniciado e o mesmo texto) é nosso (I2)", async () => {
    const { phone, id } = FIXTURES.leads.novo;
    await sb.from("dlbjj_fila_saida").insert({ phone, kind: "resposta", corpo: "Olá! 👋 Bem-vindo/a", estado: "a_enviar", locked_by: "w", locked_at: new Date().toISOString(), envio_iniciado_em: new Date().toISOString() });
    const r = await applyHandoff(sb, { id: "wamid.ainda-sem-id", phone, chatId: `${phone}@c.us`, text: "Olá! 👋 Bem-vindo/a" }, 24);
    expect(r).toBe("ignorado");
    const { data } = await sb.from("dlbjj_leads").select("paused").eq("id", id).single();
    expect(data!.paused).toBe(false);
    // Texto diferente no mesmo instante: é mesmo o Daniel.
    const r2 = await applyHandoff(sb, { id: "wamid.daniel-2", phone, chatId: `${phone}@c.us`, text: "Sou eu, o Daniel" }, 24);
    expect(r2).toBe("pausado");
  });

  it("o Daniel escreve a um número novo: a lead nasce já com humano", async () => {
    const phone = "351900000777";
    const r = await applyHandoff(sb, { id: "wamid.novo-1", phone, chatId: `${phone}@c.us`, text: "Boa tarde!" }, 24);
    expect(r).toBe("pausado");
    const { data: lead } = await sb.from("dlbjj_leads").select("status,paused,step").eq("phone", phone).single();
    expect(lead).toMatchObject({ status: "humano", paused: true, step: "inicio" });
  });

  it("um eco sem telefone (@lid) não faz nada", async () => {
    const r = await applyHandoff(sb, { id: "wamid.lid-1", phone: null, chatId: "123456789@lid", text: "x" }, 24);
    expect(r).toBe("sem_telefone");
  });
});
