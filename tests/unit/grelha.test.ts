import { describe, expect, it } from "vitest";
import { grelhaSemanal } from "@/lib/aulas/grelha";

const t = (id: string, dias_semana: number[], horario: string, turma = id) => ({ id, chave: id, local_slug: "sao-bras", turma, dias: "", dias_semana, horario, tipo: "jiu-jitsu" as const, ativa: true, presencas: 0, alunos: 0 });

describe("grelhaSemanal", () => {
  it("dias e horas distintos, blocos por célula, empilha a mesma hora", () => {
    const g = grelhaSemanal([t("a", [1, 3], "19:30:00"), t("b", [1, 3, 5], "06:00:00"), t("c", [1], "19:30:00", "Zeta"), t("d", [2, 4], "20:00:00")]);
    expect(g.dias).toEqual([1, 2, 3, 4, 5]);
    expect(g.horas).toEqual(["06:00", "19:30", "20:00"]);
    expect(g.celulas["1|19:30"].map((x) => x.id)).toEqual(["a", "c"]); // ordenado pelo nome da turma: "a" antes de "Zeta"
    expect(g.celulas["5|06:00"].map((x) => x.id)).toEqual(["b"]);
    expect(g.celulas["2|19:30"]).toBeUndefined();
  });
  it("vazio", () => {
    expect(grelhaSemanal([])).toEqual({ dias: [], horas: [], celulas: {} });
  });
});
