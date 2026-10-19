import { describe, expect, it } from "vitest";
import { descreverFaixa, faixaAtual } from "@/lib/alunos/faixas";

describe("faixaAtual", () => {
  it("é a última por atribuida_em", () => {
    const g = faixaAtual([
      { faixa: "branca", graus: 0, atribuida_em: "2024-02-01" },
      { faixa: "azul", graus: 1, atribuida_em: "2026-03-01" },
      { faixa: "azul", graus: 0, atribuida_em: "2025-06-14" },
    ]);
    expect(g).toMatchObject({ faixa: "azul", graus: 1 });
  });

  it("com a mesma data, ganha a registada mais tarde (created_at)", () => {
    const g = faixaAtual([
      { faixa: "azul", graus: 0, atribuida_em: "2026-03-01", created_at: "2026-03-01T10:00:00Z" },
      { faixa: "azul", graus: 1, atribuida_em: "2026-03-01", created_at: "2026-03-01T11:00:00Z" },
    ]);
    expect(g).toMatchObject({ graus: 1 });
  });

  it("sem graduações é null e descreve-se como —", () => {
    expect(faixaAtual([])).toBeNull();
    expect(descreverFaixa(null)).toBe("—");
    expect(descreverFaixa({ faixa: "azul", graus: 1, atribuida_em: "2026-03-01" })).toBe("Azul · 1 grau");
    expect(descreverFaixa({ faixa: "preta", graus: 3, atribuida_em: "2026-03-01" })).toBe("Preta · 3 graus");
  });
});
