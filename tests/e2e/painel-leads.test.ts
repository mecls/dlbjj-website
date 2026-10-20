import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { getPainel, postPainel } from "../helpers/painel";

const sb = db();

beforeAll(() => {
  resetDb();
});

describe("Painel — inscrições (lista) — spec §4", () => {
  it("filtra por estado e procura por nome ou telefone", async () => {
    let html = await (await getPainel("/painel/mensagens?estado=concluido")).text();
    expect(html).toContain("Carla Teste");
    expect(html).not.toContain("Bruno Teste");
    html = await (await getPainel("/painel/mensagens?q=bruno")).text();
    expect(html).toContain("Bruno Teste");
    expect(html).not.toContain("Carla Teste");
    html = await (await getPainel(`/painel/mensagens?q=${FIXTURES.leads.novo.phone.slice(-6)}`)).text();
    expect(html).toContain("Lead Novo");
    expect(html).not.toContain("Bruno Teste");
  });

  it("mostra o chip 'telemóvel' quando o Daniel respondeu pelo telemóvel", async () => {
    await sb.from("dlbjj_leads").update({ paused: true, status: "humano", human_reason: "Daniel respondeu pelo telemóvel" }).eq("id", FIXTURES.leads.emProgresso.id);
    const html = await (await getPainel("/painel/mensagens")).text();
    const linha = html.split("</a>").find((x) => x.includes("Bruno Teste"))!;
    expect(linha).toContain("telemóvel");
    expect(linha).toContain("bot em pausa");
  });
});

describe("Painel — lead — spec §4", () => {
  it("as bolhas de saída mostram o estado (na fila / enviada / falhou)", async () => {
    const { phone } = FIXTURES.leads.concluido;
    await sb.from("dlbjj_mensagens").insert([
      { phone, direction: "out", role: "bot", body: "Na fila", estado: "na_fila" },
      { phone, direction: "out", role: "bot", body: "Enviada", estado: "enviada" },
      { phone, direction: "out", role: "humano", body: "Falhou", estado: "falhou" },
    ]);
    const html = await (await getPainel(`/painel/mensagens/${phone}`)).text();
    const bolha = (texto: string) => html.split("max-w-[80%]").find((x) => x.includes(`>${texto}<`))!;
    expect(bolha("Na fila")).toContain("na fila");
    expect(bolha("Enviada")).toContain(">enviada<");
    expect(bolha("Falhou")).toContain(">falhou<");
  });

  it("'Marcar como perdido' muda o estado", async () => {
    const { phone, id } = FIXTURES.leads.novo;
    const r = await postPainel(`/api/painel/leads/${phone}/perdido`, {});
    expect(r.status).toBe(303);
    const { data } = await sb.from("dlbjj_leads").select("status").eq("id", id).single();
    expect(data!.status).toBe("perdido");
    const html = await (await getPainel(`/painel/mensagens/${phone}`)).text();
    expect(html).toContain("Perdido");
  });
});
