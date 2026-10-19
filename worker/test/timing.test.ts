import { describe, expect, it } from "vitest";
import { atrasoResposta, gaussiana, tempoDeEscrita } from "../src/outbound/timing";

describe("timing", () => {
  it("gaussiana tem a média e o desvio pedidos (aproximadamente)", () => {
    const xs = Array.from({ length: 4000 }, () => gaussiana(100, 10));
    const media = xs.reduce((a, b) => a + b, 0) / xs.length;
    const desvio = Math.sqrt(xs.reduce((a, b) => a + (b - media) ** 2, 0) / xs.length);
    expect(media).toBeGreaterThan(98);
    expect(media).toBeLessThan(102);
    expect(desvio).toBeGreaterThan(8.5);
    expect(desvio).toBeLessThan(11.5);
  });

  it("o tempo de escrita cresce com o comprimento e fica entre ~1,5 s e ~12 s", () => {
    const curto = tempoDeEscrita("Olá!", 40);
    const longo = tempoDeEscrita("x".repeat(600), 40);
    expect(curto).toBeGreaterThanOrEqual(1_300);
    expect(curto).toBeLessThan(3_000);
    expect(longo).toBeGreaterThan(curto);
    expect(longo).toBeLessThanOrEqual(13_500);
  });

  it("o atraso de resposta nunca é menor que 3 s", () => {
    for (let i = 0; i < 200; i++) expect(atrasoResposta(8, 3)).toBeGreaterThanOrEqual(3_000);
  });

  it("sem humanização tudo é zero", () => {
    expect(tempoDeEscrita("x".repeat(600), 40, false)).toBe(0);
    expect(atrasoResposta(8, 3, false)).toBe(0);
  });
});
