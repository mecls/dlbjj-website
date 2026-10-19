import { describe, expect, it } from "vitest";
import { resolveOptionText } from "@/lib/bot/resolve";
import { modalidadeOptions, publicoOptions, origemOptions } from "@/lib/bot/flow";

describe("resolveOptionText", () => {
  it("um dígito escolhe pela posição", () => {
    expect(resolveOptionText("2", publicoOptions())).toBe("pub:kids");
    expect(resolveOptionText(" 1 ", publicoOptions())).toBe("pub:adulto");
  });

  it("um dígito fora do intervalo não escolhe nada", () => {
    expect(resolveOptionText("7", modalidadeOptions())).toBeNull();
    expect(resolveOptionText("0", modalidadeOptions())).toBeNull();
  });

  it("o título da opção, sem acentos nem maiúsculas, escolhe", () => {
    expect(resolveOptionText("Jiu-Jitsu", modalidadeOptions())).toBe("mod:jiu-jitsu");
    expect(resolveOptionText("jiu jitsu", modalidadeOptions())).toBe("mod:jiu-jitsu");
    expect(resolveOptionText("recomendacao", origemOptions())).toBe("org:recomendacao");
  });

  it("palavras do título por ordem chegam ('para o filho' → kids)", () => {
    expect(resolveOptionText("para o filho", publicoOptions())).toBe("pub:kids");
    expect(resolveOptionText("mim", publicoOptions())).toBe("pub:adulto");
  });

  it("um texto que serve para várias opções não escolhe nenhuma", () => {
    expect(resolveOptionText("para", publicoOptions())).toBeNull();
  });

  it("só uma palavra vazia de sentido ('o') não escolhe", () => {
    expect(resolveOptionText("o", publicoOptions())).toBeNull();
  });

  it("texto sem relação não escolhe nada", () => {
    expect(resolveOptionText("talvez", publicoOptions())).toBeNull();
    expect(resolveOptionText("quanto custa?", modalidadeOptions())).toBeNull();
  });
});
