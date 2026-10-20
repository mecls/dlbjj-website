import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { getAluno, sessaoDe } from "../helpers/aluno";
import { hojeLisboa } from "@/lib/tempo";

const sb = db();
beforeAll(() => {
  resetDb();
});

describe("Início do aluno (design §5.2)", () => {
  it("mostra faixa, membro desde, última aula, os quatro números e a academia", async () => {
    const { ana } = FIXTURES.alunos;
    const html = await (await getAluno("/aluno", await sessaoDe(ana.id, ana.phone))).text();
    expect(html).toContain("Ana 👋");
    expect(html).toContain("Faixa Azul · 1 grau");
    expect(html).toContain("Membro desde fevereiro de 2024");
    expect(html).toContain("Última aula:");
    const { count } = await sb.from("dlbjj_presencas").select("*", { count: "exact", head: true }).eq("aluno_id", ana.id).gte("data", `${hojeLisboa().slice(0, 7)}-01`);
    expect(html).toMatch(new RegExp(`>${count}<[\\s\\S]{0,200}Aulas este mês`));
    expect(html).toMatch(/>18<[\s\S]{0,200}Aulas desde o início/);
    for (const t of ["Dias seguidos", "Posição no ranking", "de 4 este mês", "Aulas de hoje"]) expect(html, t).toContain(t);
    // os números da academia inteira são do painel do Daniel, não do aluno
    for (const t of ["A minha academia", "Aulas esta semana", "Presenças este mês", "Alunos ativos", "Turma mais concorrida"]) expect(html, t).not.toContain(t);
    expect(html).toContain('title="'); // células do mapa de calor
    expect(html).not.toContain(ana.phone);
    expect(html).not.toContain("ana@example.com");
  });
  it("aluno sem presenças: zeros e sem última aula", async () => {
    // dlbjj_presencas é só de acrescentar (trigger): um aluno novo é a única forma de ter zero presenças.
    const { data: novo } = await sb
      .from("dlbjj_alunos")
      .insert({ nome: "Nuno Novo", phone: "351920000005", publico: "adulto", modalidade: "jiu-jitsu", local_slug: "sao-bras", inicio_em: "2026-10-01", estado: "ativo", consentimento_rgpd_em: new Date().toISOString() })
      .select("id")
      .single();
    const html = await (await getAluno("/aluno", await sessaoDe(novo!.id, "351920000005"))).text();
    expect(html).toContain("Nuno 👋");
    expect(html).toContain("Ainda sem presenças");
    expect(html).toContain("Ainda sem faixa registada");
    expect(html).toMatch(/>0<[\s\S]{0,200}Aulas este mês/);
    expect(html).toMatch(/>0<[\s\S]{0,200}Dias seguidos/);
    expect(html).toMatch(/>\d\.º<[\s\S]{0,200}Posição no ranking/); // última posição distinta; o número depende dos empates do mês
    expect(html).toContain("de 5 este mês");
  });
});
