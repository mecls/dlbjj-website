import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { getPainel, postPainel } from "../helpers/painel";

const sb = db();

beforeAll(() => {
  resetDb();
});

describe("Painel — reativação", () => {
  it("lista quem está em atraso e o contador do dia", async () => {
    const r = await getPainel("/painel/reativacao");
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain("Enviadas hoje: 0 / 10");
    expect(html).toContain("Carla Teste"); // R3
    expect(html).toContain("Bruno Teste"); // R1
    expect(html).toContain(FIXTURES.optOutPhone.slice(0, 0) + "opt-out");
  });

  it("Saltar regista um toque saltado e tira a pessoa da lista", async () => {
    const r = await postPainel("/api/painel/reativacao/saltar", { phone: FIXTURES.leads.emProgresso.phone, regra: "R1" });
    expect(r.status).toBe(303);
    const { data } = await sb.from("dlbjj_toques").select("estado,regra").eq("phone", FIXTURES.leads.emProgresso.phone);
    expect(data).toEqual([{ estado: "saltada", regra: "R1" }]);
    const html = await (await getPainel("/painel/reativacao")).text();
    const emAtraso = html.slice(html.indexOf("Em atraso agora"), html.indexOf(">Toques<"));
    expect(emAtraso).not.toContain("Bruno Teste");
    expect(html.slice(html.indexOf(">Toques<"))).toContain("saltada");
  });

  it("Enviar agora põe a mensagem na fila para já", async () => {
    const r = await postPainel("/api/painel/reativacao/enviar", { phone: FIXTURES.leads.concluido.phone, regra: "R3" });
    expect(r.status).toBe(303);
    const { data } = await sb.from("dlbjj_fila_saida").select("kind,regra,enviar_apos").eq("phone", FIXTURES.leads.concluido.phone).eq("kind", "proativa").single();
    expect(data!.regra).toBe("R3");
    expect(new Date(data!.enviar_apos).getTime()).toBeLessThanOrEqual(Date.now() + 5_000);
    const html = await (await getPainel("/painel/reativacao")).text();
    expect(html).toContain("na fila");
  });

  it("Correr regras agora não repete quem já foi tocado", async () => {
    const r = await postPainel("/api/painel/reativacao/correr", {});
    expect(r.status).toBe(303);
    const { count } = await sb.from("dlbjj_toques").select("*", { count: "exact", head: true });
    expect(count).toBe(2);
  });

  it("sem sessão → 401 nas ações e 307 na página", async () => {
    expect((await postPainel("/api/painel/reativacao/correr", {}, false)).status).toBe(401);
    expect((await getPainel("/painel/reativacao", false)).status).toBe(307);
  });
});
