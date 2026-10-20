import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { getAluno, sessaoDe } from "../helpers/aluno";
import { postPainel } from "../helpers/painel";

const sb = db();
let ana: string, ines: string, nuno: string;
const NUNO_PHONE = "351920000005";

beforeAll(async () => {
  resetDb();
  ana = await sessaoDe(FIXTURES.alunos.ana.id, FIXTURES.alunos.ana.phone);
  ines = await sessaoDe(FIXTURES.alunos.ines.id, FIXTURES.alunos.ines.phone);
  // dlbjj_presencas é só de acrescentar: um aluno novo é a única forma de ter zero presenças.
  const { data: novo } = await sb
    .from("dlbjj_alunos")
    .insert({ nome: "Nuno Novo", phone: NUNO_PHONE, publico: "adulto", modalidade: "jiu-jitsu", local_slug: "sao-bras", inicio_em: "2026-10-01", estado: "ativo", consentimento_rgpd_em: new Date().toISOString() })
    .select("id")
    .single();
  nuno = await sessaoDe(novo!.id, NUNO_PHONE);
});

describe("Histórico (design §5.3)", () => {
  it("agrupa por mês, mostra hora, turma e local, e o mapa de 6 meses", async () => {
    const html = await (await getAluno("/aluno/historico", ana)).text();
    expect(html).toContain("Últimos 6 meses");
    expect(html).toMatch(/ de 20\d\d · \d+ aulas?/);
    expect(html).toContain("19:30 · Jiu-Jitsu · São Brás");
    expect(html).not.toContain("Rui");
  });
  it("sem presenças explica como marcar", async () => {
    const html = await (await getAluno("/aluno/historico", nuno)).text();
    expect(html).toContain("Ainda não tens presenças");
  });
});

describe("Ranking (design §5.4)", () => {
  it("primeiros nomes, faixas, posição da aluna e quem tem 0 no fim", async () => {
    const html = await (await getAluno("/aluno/ranking?periodo=sempre", ana)).text();
    expect(html).toMatch(/Estás em \d\.º de 5/);
    for (const n of ["Ana", "Rui", "João", "Inês", "Nuno"]) expect(html, n).toContain(n);
    expect(html).not.toContain("Costa"); // apelidos dos outros nunca aparecem (o da própria está no menu do avatar)
    expect(html).not.toContain("Pereira");
    expect(html).toContain("data-eu");
    expect(html).toContain("Azul · 1 grau");
    expect(html.lastIndexOf("Nuno")).toBeGreaterThan(html.lastIndexOf("Inês")); // sem presenças fica no fim
    expect(html).toContain("0 aulas");
  });
  it("este mês é o separador por omissão", async () => {
    const html = await (await getAluno("/aluno/ranking", ana)).text();
    expect(html).toContain("Este mês");
    expect(html).toContain("Desde sempre");
  });
  it("o Daniel pode esconder um aluno do ranking", async () => {
    const r = await postPainel(`/api/painel/alunos/${FIXTURES.alunos.ines.id}/ranking`, {});
    expect(r.status).toBe(303);
    let html = await (await getAluno("/aluno/ranking?periodo=sempre", ana)).text();
    expect(html).not.toContain("Inês");
    expect(html).toMatch(/Estás em \d\.º de 4/);
    html = await (await getAluno("/aluno/ranking", ines)).text();
    expect(html).toContain("Não apareces no ranking.");
    expect(await (await getAluno("/aluno", ines)).text()).toMatch(/>—<[\s\S]{0,200}Posição no ranking/);
    await postPainel(`/api/painel/alunos/${FIXTURES.alunos.ines.id}/ranking`, { visivel: "1" });
    expect(await (await getAluno("/aluno/ranking?periodo=sempre", ana)).text()).toContain("Inês");
  });
});
