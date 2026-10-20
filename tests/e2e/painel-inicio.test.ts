import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { getPainel } from "../helpers/painel";

const sb = db();
beforeAll(() => {
  resetDb();
});

describe("Painel — Início (design §6)", () => {
  it("saudação, agente, números e academia", async () => {
    const html = await (await getPainel("/painel")).text();
    expect(html).toContain("Daniel 👋");
    expect(html).not.toContain("Agente de WhatsApp"); // vive só em /painel/agente
    expect(html).toMatch(/>4<[\s\S]{0,200}Alunos ativos/);
    for (const t of ["Presenças este mês", "Inscrições este mês", "Conversas à espera", "A minha academia", "Aulas esta semana", "Turma mais concorrida", "Alunos inativos", "Reativações por enviar"]) expect(html, t).toContain(t);
  });
  it("conversa à espera aparece no número, no crachá e no sino", async () => {
    const { emProgresso } = FIXTURES.leads;
    await sb.from("dlbjj_leads").update({ paused: true, status: "humano" }).eq("id", emProgresso.id);
    await sb.from("dlbjj_mensagens").insert({ lead_id: emProgresso.id, phone: emProgresso.phone, direction: "in", role: "lead", body: "Olá?" });
    const html = await (await getPainel("/painel")).text();
    expect(html).toMatch(/>1<[\s\S]{0,200}Conversas à espera/);
    expect(html).toContain('data-badge="1"');
    expect(html).toContain('data-sino="ativo"');
  });
  it("o sino acende quando o worker deixou de dar sinal", async () => {
    // O teste anterior deixou uma conversa à espera (que também acende o sino): retoma-a primeiro.
    await sb.from("dlbjj_leads").update({ paused: false, status: "em_progresso" }).eq("id", FIXTURES.leads.emProgresso.id);
    await sb.from("dlbjj_sessao").upsert({ id: 1, estado: "ligado", visto_em: new Date(Date.now() - 20 * 60_000).toISOString() }, { onConflict: "id" });
    expect(await (await getPainel("/painel")).text()).toContain('data-sino="ativo"');
    await sb.from("dlbjj_sessao").update({ visto_em: new Date().toISOString() }).eq("id", 1);
    expect(await (await getPainel("/painel/alunos")).text()).toContain('data-sino="inativo"');
    await sb.from("dlbjj_sessao").delete().eq("id", 1);
  });
  it("as conversas vivem em /painel/mensagens", async () => {
    expect((await getPainel("/painel/mensagens?estado=concluido")).status).toBe(200);
    expect(await (await getPainel(`/painel/mensagens/${FIXTURES.leads.concluido.phone}`)).text()).toContain("Carla Teste");
  });
});
