import { beforeAll, describe, expect, it } from "vitest";
import { FIXTURES, resetDb } from "../helpers/db";
import { getPainel, postPainel } from "../helpers/painel";
import { inject } from "../helpers/app";

beforeAll(() => {
  resetDb();
});

describe("Painel — conversa com painel lateral (ajustes §2.2–§2.3)", () => {
  it("a conversa está ao centro e a pessoa à direita; sem conversa não chama o modelo", async () => {
    const { phone } = FIXTURES.leads.novo;
    const html = await (await getPainel(`/painel/mensagens/${phone}`)).text();
    expect(html).toContain("data-rail");
    expect(html).toContain("data-detalhes");
    for (const s of ["Pessoa", "Situação", "Lead", "Ações", "Aluno", "Ainda não há conversa para resumir."]) expect(html, s).toContain(s);
    expect(html).not.toContain("Escrever resumo");
    const r = await postPainel(`/api/painel/leads/${phone}/resumo`, {});
    expect(r.headers.get("location")).toContain("erro=sem_conversa");
  });
  it("escreve o resumo, mostra-o com a contagem, e avisa quando há conversa nova", async () => {
    const { phone } = FIXTURES.leads.emProgresso;
    await inject({ from: phone, text: "quero treinar em São Brás" });
    let html = await (await getPainel(`/painel/mensagens/${phone}`)).text();
    expect(html).toContain("Escrever resumo");
    const r = await postPainel(`/api/painel/leads/${phone}/resumo`, {});
    expect(r.headers.get("location")).toContain("ok=resumo");
    html = await (await getPainel(`/painel/mensagens/${phone}`)).text();
    expect(html).toContain("quero treinar em São Brás");
    expect(html).toContain("Saber mais sobre as aulas.");
    expect(html).toMatch(/\d+ mensagens · até/);
    expect(html).toContain("Atualizar");
    expect(html).not.toContain("Há conversa depois disto.");
    await inject({ from: phone, text: "e aos sábados?" });
    html = await (await getPainel(`/painel/mensagens/${phone}`)).text();
    expect(html).toContain("Há conversa depois disto.");
  });
  it("lixo do modelo deixa o resumo anterior e avisa", async () => {
    const { phone } = FIXTURES.leads.emProgresso;
    await inject({ from: phone, text: "[[lixo]]" });
    const r = await postPainel(`/api/painel/leads/${phone}/resumo`, {});
    expect(r.headers.get("location")).toContain("erro=resumo");
    const html = await (await getPainel(`/painel/mensagens/${phone}?erro=resumo`)).text();
    expect(html).toContain("Não consegui resumir. Tenta outra vez.");
    expect(html).toContain("Saber mais sobre as aulas.");
  });
});
