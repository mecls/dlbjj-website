import { describe, expect, it } from "vitest";
import { diasParaSemana } from "@/lib/turmas/dias";
import { locais } from "@/content/site";

describe("diasParaSemana", () => {
  it("lê 'Terça e Quinta' como terça (2) e quinta (4)", () => {
    expect(diasParaSemana("Terça e Quinta")).toEqual([2, 4]);
  });

  it("lê 'Segunda, Quarta e Sexta' como [1, 3, 5]", () => {
    expect(diasParaSemana("Segunda, Quarta e Sexta")).toEqual([1, 3, 5]);
  });

  it("lê 'Sábado' como [6]", () => {
    expect(diasParaSemana("Sábado")).toEqual([6]);
  });

  it("lê 'Sexta-feira' como [5]", () => {
    expect(diasParaSemana("Sexta-feira")).toEqual([5]);
  });

  it("lê 'Segunda e Quarta' como [1, 3]", () => {
    expect(diasParaSemana("Segunda e Quarta")).toEqual([1, 3]);
  });

  it("lê 'Domingo' como [7] (ISO: segunda = 1 … domingo = 7)", () => {
    expect(diasParaSemana("Domingo")).toEqual([7]);
  });

  it("rejeita um texto sem nenhum dia da semana", () => {
    expect(() => diasParaSemana("todos os dias")).toThrow(/dia da semana/);
  });

  it("resolve todos os `dias` reais de content/site.ts", () => {
    for (const local of locais) {
      for (const aula of local.aulas) {
        const dias = diasParaSemana(aula.dias);
        expect(dias.length, `${local.nome} · ${aula.turma} · ${aula.dias}`).toBeGreaterThan(0);
      }
    }
  });
});
