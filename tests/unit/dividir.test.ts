import { describe, expect, it } from "vitest";
import { dividirCorpo } from "@/lib/bot/dividir";

describe("dividirCorpo (máx. 900 caracteres por mensagem)", () => {
  it("um texto curto fica inteiro", () => {
    expect(dividirCorpo("Olá!")).toEqual(["Olá!"]);
  });
  it("divide nas linhas em branco sem cortar parágrafos", () => {
    const p1 = "a".repeat(500);
    const p2 = "b".repeat(500);
    const p3 = "c".repeat(100);
    expect(dividirCorpo(`${p1}\n\n${p2}\n\n${p3}`)).toEqual([p1, `${p2}\n\n${p3}`]);
  });
  it("um parágrafo sozinho acima do limite é cortado no último espaço", () => {
    const palavras = Array.from({ length: 300 }, (_, i) => `p${i}`).join(" ");
    const partes = dividirCorpo(palavras);
    expect(partes.length).toBeGreaterThan(1);
    for (const x of partes) expect(x.length).toBeLessThanOrEqual(900);
    expect(partes.join(" ")).toBe(palavras);
  });
  it("a lista numerada e a dica ficam juntas quando cabem", () => {
    const texto = "Pergunta?\n\n1. A\n2. B\n\n(Responde com o número)";
    expect(dividirCorpo(texto)).toEqual([texto]);
  });
});
