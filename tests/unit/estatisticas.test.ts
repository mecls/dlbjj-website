import { describe, expect, it } from "vitest";
import {
  aulasDaSemana,
  aulasDesdeInicio,
  aulasNoMes,
  descreverUltimaAula,
  diasSeguidos,
  mapaDeCalor,
  mesAnterior,
  mesDeCalendario,
  mesSeguinte,
  mesValido,
  nomesCurtos,
  ordenarRanking,
  posicaoNoRanking,
  saudacao,
} from "@/lib/aluno/estatisticas";
import { instanteLisboa } from "@/lib/tempo";

const p = (...datas: string[]) => datas.map((data) => ({ data }));
const HOJE = "2026-10-20"; // terça-feira

describe("contagens", () => {
  it("aulas no mês e desde o início", () => {
    const pres = p("2026-10-19", "2026-10-01", "2026-09-30", "2025-01-05");
    expect(aulasNoMes(pres, HOJE)).toBe(2);
    expect(aulasDesdeInicio(pres)).toBe(4);
  });
  it("aulas da semana soma os dias das turmas ativas", () => {
    expect(
      aulasDaSemana([
        { dias_semana: [1, 3, 5], ativa: true },
        { dias_semana: [2, 4], ativa: true },
        { dias_semana: [6], ativa: false },
      ]),
    ).toBe(5);
  });
});

describe("diasSeguidos", () => {
  const semana = [1, 2, 3, 4, 5];
  it("hoje sem check-in não quebra; fim de semana sem aulas salta; dia com aula sem check-in pára", () => {
    expect(diasSeguidos(p("2026-10-19", "2026-10-16", "2026-10-15"), semana, HOJE)).toBe(3);
  });
  it("hoje com check-in conta", () => {
    expect(diasSeguidos(p("2026-10-20", "2026-10-19", "2026-10-16", "2026-10-15"), semana, HOJE)).toBe(4);
  });
  it("sem turmas não salta nenhum dia", () => {
    expect(diasSeguidos(p("2026-10-19", "2026-10-16"), [], HOJE)).toBe(1);
  });
  it("sem presenças é 0; duas no mesmo dia contam um", () => {
    expect(diasSeguidos([], semana, HOJE)).toBe(0);
    expect(diasSeguidos(p("2026-10-19", "2026-10-19"), semana, HOJE)).toBe(1);
  });
  it("pára aos 366 dias", () => {
    const todos = Array.from({ length: 400 }, (_, i) => ({ data: new Date(Date.UTC(2026, 9, 20 - i)).toISOString().slice(0, 10) }));
    expect(diasSeguidos(todos, [], HOJE)).toBe(366);
  });
});

describe("ranking", () => {
  const c = [
    { alunoId: "a", n: 5 },
    { alunoId: "b", n: 5 },
    { alunoId: "c", n: 3 },
    { alunoId: "d", n: 0 },
  ];
  it("posição densa", () => {
    expect(posicaoNoRanking(c, "a")).toEqual({ posicao: 1, total: 4 });
    expect(posicaoNoRanking(c, "b")).toEqual({ posicao: 1, total: 4 });
    expect(posicaoNoRanking(c, "c")).toEqual({ posicao: 2, total: 4 });
    expect(posicaoNoRanking(c, "d")).toEqual({ posicao: 3, total: 4 });
    expect(posicaoNoRanking(c, "zz")).toEqual({ posicao: null, total: 4 });
  });
  it("nomes curtos", () => {
    expect(nomesCurtos(["Ana Silva", "Ana Santos", "Rui Costa"])).toEqual(["Ana S.", "Ana S.", "Rui"]);
  });
  it("ordena, desempata pelo nome e mantém quem tem 0 no fim", () => {
    const r = ordenarRanking([
      { alunoId: "i", nome: "Inês Pereira", faixa: null, n: 0 },
      { alunoId: "r", nome: "Rui Costa", faixa: null, n: 5 },
      { alunoId: "a", nome: "Ana Silva", faixa: null, n: 5 },
      { alunoId: "j", nome: "João Pereira", faixa: null, n: 2 },
    ]);
    expect(r.map((x) => [x.posicao, x.nomeCurto, x.n])).toEqual([
      [1, "Ana", 5],
      [1, "Rui", 5],
      [2, "João", 2],
      [3, "Inês", 0],
    ]);
  });
});

describe("mapaDeCalor", () => {
  it("12 semanas terminam no domingo desta semana; o futuro fica marcado", () => {
    const m = mapaDeCalor(p("2026-10-19", "2026-10-19", "2026-08-03"), HOJE, 12);
    expect(m).toHaveLength(84);
    expect(m[0]).toEqual({ dia: "2026-08-03", n: 1, futuro: false });
    expect(m.at(-1)).toEqual({ dia: "2026-10-25", n: 0, futuro: true });
    expect(m.find((c) => c.dia === "2026-10-19")!.n).toBe(2);
    expect(m.find((c) => c.dia === "2026-10-20")!.futuro).toBe(false);
    expect(m.find((c) => c.dia === "2026-10-21")!.futuro).toBe(true);
  });
});

describe("texto", () => {
  it("saudação pela hora de Lisboa", () => {
    expect(saudacao(instanteLisboa(HOJE, "11:59"))).toBe("Bom dia");
    expect(saudacao(instanteLisboa(HOJE, "12:00"))).toBe("Boa tarde");
    expect(saudacao(instanteLisboa(HOJE, "19:59"))).toBe("Boa tarde");
    expect(saudacao(instanteLisboa(HOJE, "20:00"))).toBe("Boa noite");
  });
  it("última aula", () => {
    expect(descreverUltimaAula("2026-10-20", HOJE)).toBe("hoje (20 de outubro)");
    expect(descreverUltimaAula("2026-10-19", HOJE)).toBe("ontem (19 de outubro)");
    expect(descreverUltimaAula("2026-10-17", HOJE)).toBe("há 3 dias (17 de outubro)");
    expect(descreverUltimaAula("2026-10-13", HOJE)).toBe("há 7 dias (13 de outubro)");
    expect(descreverUltimaAula("2026-10-12", HOJE)).toBe("em 12 de outubro");
    expect(descreverUltimaAula("2026-09-02", HOJE)).toBe("em 2 de setembro");
  });
});

describe("calendário", () => {
  const turma = { id: "t1", chave: "k", local_slug: "sao-bras", turma: "Jiu-Jitsu", dias: "Terça e Quinta", dias_semana: [2, 4], horario: "20:00:00", tipo: "jiu-jitsu" as const, ativa: true };
  const evento = { id: "e1", titulo: "Seminário", dia: "2026-10-20", hora: "10:00", local_slug: null };
  it("outubro de 2026 começa na segunda 28 de setembro e tem 5 linhas", () => {
    const m = mesDeCalendario("2026-10", [turma], [evento], p("2026-10-19"), HOJE);
    expect(m).toHaveLength(5);
    expect(m[0][0]).toMatchObject({ dia: "2026-09-28", noMes: false });
    expect(m[4][6]).toMatchObject({ dia: "2026-11-01", noMes: false });
    const dia20 = m.flat().find((c) => c.dia === "2026-10-20")!;
    expect(dia20).toMatchObject({ hoje: true, noMes: true, presente: false, aulas: [{ id: "t1", horario: "20:00", turma: "Jiu-Jitsu" }], eventos: [evento] });
    expect(m.flat().find((c) => c.dia === "2026-10-19")!.presente).toBe(true);
    expect(m.flat().find((c) => c.dia === "2026-10-21")!.aulas).toEqual([]);
  });
  it("fevereiro de 2027 começa a uma segunda e tem 4 linhas", () => {
    expect(mesDeCalendario("2027-02", [], [], [], HOJE)).toHaveLength(4);
  });
  it("mês válido, anterior e seguinte", () => {
    expect(mesValido("abc", HOJE)).toBe("2026-10");
    expect(mesValido("2026-13", HOJE)).toBe("2026-10");
    expect(mesValido("2025-02", HOJE)).toBe("2025-02");
    expect(mesAnterior("2026-01")).toBe("2025-12");
    expect(mesSeguinte("2026-12")).toBe("2027-01");
  });
});
