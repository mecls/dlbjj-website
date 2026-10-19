import { describe, expect, it } from "vitest";
import { proximaAula, resolverAulasDoDia, type TurmaRow } from "@/lib/bot/checkin";

const t = (chave: string, local_slug: string, turma: string, dias_semana: number[], horario: string, tipo: TurmaRow["tipo"]): TurmaRow => ({
  id: chave,
  chave,
  local_slug,
  turma,
  dias: "",
  dias_semana,
  horario,
  tipo,
  ativa: true,
});

const TURMAS: TurmaRow[] = [
  t("sb-jj-0600", "sao-bras", "Jiu-Jitsu", [1, 3, 5], "06:00:00", "jiu-jitsu"),
  t("sb-jj-1100", "sao-bras", "Jiu-Jitsu", [1, 3, 5], "11:00:00", "jiu-jitsu"),
  t("sb-jj-1930", "sao-bras", "Jiu-Jitsu", [1, 3], "19:30:00", "jiu-jitsu"),
  t("sb-jj-2030", "sao-bras", "Jiu-Jitsu", [1, 3], "20:30:00", "jiu-jitsu"),
  t("sb-mma-1830", "sao-bras", "MMA (Adultos)", [1, 3, 5], "18:30:00", "mma"),
  t("sb-mma-1100", "sao-bras", "MMA (Adultos)", [2, 4], "11:00:00", "mma"),
  t("sb-jj-2000", "sao-bras", "Jiu-Jitsu", [2, 4], "20:00:00", "jiu-jitsu"),
  t("sb-livre", "sao-bras", "Treino Livre (Gi e NoGi)", [5], "20:00:00", "misto"),
  t("q-kids-1830", "queluz", "Kids", [2, 4], "18:30:00", "kids"),
  t("q-kids-sab", "queluz", "Kids", [6], "10:00:00", "kids"),
  t("q-jj-0800", "queluz", "Jiu-Jitsu (Adultos)", [2, 3, 5], "08:00:00", "jiu-jitsu"),
];

const ana = { id: "ana", nome: "Ana", publico: "adulto" as const, modalidade: "jiu-jitsu" as const, local_slug: "sao-bras" };
const kid = { id: "kid", nome: "João", publico: "kids" as const, modalidade: "jiu-jitsu" as const, local_slug: "queluz" };

describe("resolverAulasDoDia", () => {
  it("segunda em São Brás para jiu-jitsu dá as 4 aulas de JJ (sem o MMA), por hora", () => {
    const r = resolverAulasDoDia(ana, TURMAS, new Date("2026-11-02T19:45:00Z"));
    expect(r.fallback).toBe(false);
    expect(r.candidatas.map((c) => c.id)).toEqual(["sb-jj-0600", "sb-jj-1100", "sb-jj-1930", "sb-jj-2030"]);
  });

  it("sexta: o treino livre (misto) conta para jiu-jitsu e nogi", () => {
    const sexta = new Date("2026-11-06T18:00:00Z");
    expect(resolverAulasDoDia(ana, TURMAS, sexta).candidatas.map((c) => c.id)).toEqual(["sb-jj-0600", "sb-jj-1100", "sb-livre"]);
    const nogi = { ...ana, modalidade: "nogi" as const };
    expect(resolverAulasDoDia(nogi, TURMAS, sexta).candidatas.map((c) => c.id)).toEqual(["sb-livre"]);
  });

  it("kids em Queluz numa terça dá só a aula de kids", () => {
    const r = resolverAulasDoDia(kid, TURMAS, new Date("2026-11-03T17:00:00Z"));
    expect(r.candidatas.map((c) => c.id)).toEqual(["q-kids-1830"]);
  });

  it("sem aula da modalidade, cai para qualquer aula do espaço nesse dia", () => {
    const mma = { ...ana, modalidade: "mma" as const };
    const terca = new Date("2026-11-03T19:00:00Z");
    const r = resolverAulasDoDia(mma, TURMAS, terca);
    expect(r.fallback).toBe(false);
    expect(r.candidatas.map((c) => c.id)).toEqual(["sb-mma-1100"]);
    const kidsSb = { ...kid, local_slug: "sao-bras" };
    const r2 = resolverAulasDoDia(kidsSb, TURMAS, terca);
    expect(r2.fallback).toBe(true);
    expect(r2.candidatas.map((c) => c.id)).toEqual(["sb-mma-1100", "sb-jj-2000"]);
  });

  it("domingo não há nada", () => {
    const r = resolverAulasDoDia(ana, TURMAS, new Date("2026-11-01T12:00:00Z"));
    expect(r.candidatas).toEqual([]);
  });

  it("ignora turmas inativas", () => {
    const inativas = TURMAS.map((x) => ({ ...x, ativa: false }));
    expect(resolverAulasDoDia(ana, inativas, new Date("2026-11-02T19:45:00Z")).candidatas).toEqual([]);
  });
});

describe("proximaAula", () => {
  it("de domingo, a próxima aula de JJ em São Brás é segunda às 06:00", () => {
    const p = proximaAula(ana, TURMAS, new Date("2026-11-01T12:00:00Z"));
    expect(p).toMatchObject({ id: "sb-jj-0600", diaNome: "segunda", horario: "06:00" });
  });

  it("de segunda às 21:00 (já passou tudo), a próxima é terça às 20:00", () => {
    const p = proximaAula(ana, TURMAS, new Date("2026-11-02T21:00:00Z"));
    expect(p).toMatchObject({ id: "sb-jj-2000", diaNome: "terça", horario: "20:00" });
  });

  it("kids em Queluz numa quarta: a próxima é quinta às 18:30", () => {
    const p = proximaAula(kid, TURMAS, new Date("2026-11-04T10:00:00Z"));
    expect(p).toMatchObject({ id: "q-kids-1830", diaNome: "quinta", horario: "18:30" });
  });
});
