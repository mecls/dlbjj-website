import { describe, expect, it } from "vitest";
import { renderOptions } from "@/lib/bot/render";
import { publicoOptions, origemOptions } from "@/lib/bot/flow";

describe("renderOptions", () => {
  it("escreve a pergunta, uma linha em branco, as opções numeradas e a dica", () => {
    const texto = renderOptions("A inscrição é para ti ou para um/a filho/a?", publicoOptions());
    expect(texto).toBe(
      "A inscrição é para ti ou para um/a filho/a?\n\n1. Para mim\n2. Para o/a filho/a\n\n(Responde com o número)",
    );
  });

  it("sem opções devolve só o texto, sem dica", () => {
    expect(renderOptions("Como te chamas?", [])).toBe("Como te chamas?");
  });

  it("numera até 9 opções e ignora as restantes", () => {
    const muitas = Array.from({ length: 12 }, (_, i) => ({ id: `o:${i}`, title: `Opção ${i + 1}` }));
    const texto = renderOptions("Escolhe", muitas);
    expect(texto).toContain("9. Opção 9");
    expect(texto).not.toContain("10. Opção 10");
  });

  it("mantém a ordem das opções de origem", () => {
    const texto = renderOptions("Como nos conheceste?", origemOptions());
    expect(texto.split("\n").slice(2, 7)).toEqual([
      "1. Instagram",
      "2. Google",
      "3. Recomendação",
      "4. Passei à porta",
      "5. Outro",
    ]);
  });
});
