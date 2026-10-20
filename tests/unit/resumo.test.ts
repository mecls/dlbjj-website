import { describe, expect, it } from "vitest";
import { extrairResumo, redigir } from "@/lib/painel/resumo";

describe("redigir", () => {
  it("esconde códigos e links com token", () => {
    expect(redigir("O teu código é *123456*. Vale 10 minutos.")).toBe("O teu código é *[código]*. Vale 10 minutos.");
    expect(redigir("Preenche http://x/inscricao/abcdefghijklmnopqrstuvwxyz123 hoje")).toBe("Preenche http://x/inscricao/[link] hoje");
    expect(redigir("entra em http://x/aluno/abcdefghijklmnopqrstuvwxyz123")).toBe("entra em http://x/aluno/[link]");
    expect(redigir("olá, tudo bem?")).toBe("olá, tudo bem?");
  });
});

describe("extrairResumo", () => {
  it("aceita o JSON e corta ao tamanho", () => {
    const r = extrairResumo('{"situacao":"' + "a".repeat(300) + '","quer":"treinar"}');
    expect(r!.situacao).toHaveLength(240);
    expect(r!.quer).toBe("treinar");
  });
  it("recusa lixo e campos vazios", () => {
    expect(extrairResumo("isto não é json")).toBeNull();
    expect(extrairResumo('{"situacao":"","quer":"x"}')).toBeNull();
    expect(extrairResumo('{"situacao":"x"}')).toBeNull();
  });
});
