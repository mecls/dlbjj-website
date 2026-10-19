import { describe, expect, it } from "vitest";
import { isCheckin, isOptOut, isPerfil } from "@/lib/bot/keywords";

describe("isOptOut", () => {
  it.each([
    "não quero mais mensagens",
    "Nao quero receber mais nada",
    "parar",
    "PARAR!",
    "para de me mandar mensagens",
    "não me mandes mais mensagens",
    "não me mandem mensagens",
    "não enviem mais",
    "remover",
    "remove-me da lista",
    "stop",
    "cancelar mensagens",
    "deixa-me em paz",
    "deixem-me em paz 🙏",
  ])("reconhece %j", (texto) => {
    expect(isOptOut(texto)).toBe(true);
  });

  it.each([
    "não quero MMA, quero jiu-jitsu",
    "quero parar de treinar MMA e passar para NoGi",
    "preparar a inscrição",
    "o stop da minha mota avariou",
    "1",
    "olá",
  ])("não confunde %j com opt-out", (texto) => {
    expect(isOptOut(texto)).toBe(false);
  });

  it("no passo do nome, uma frase longa com 'parar' não é opt-out", () => {
    const frase = "Chamo-me Joana e gostava de parar de adiar e começar a treinar";
    expect(isOptOut(frase, "nome")).toBe(false);
    expect(isOptOut("parar", "nome")).toBe(true);
  });
});

describe("isCheckin", () => {
  it.each(["presente", "Presente!", "Presente 🥋", "cheguei", "check-in", "checkin", "check in", "estou aqui", "tou aqui", "vou treinar", "treinei", "presença"])(
    "reconhece %j",
    (texto) => expect(isCheckin(texto)).toBe(true),
  );
  it.each(["apresentei-me ao professor", "presente para o meu filho", "cheguei a casa", "1"])("não confunde %j", (texto) =>
    expect(isCheckin(texto)).toBe(false),
  );
});

describe("isPerfil", () => {
  it.each(["perfil", "Perfil", "a minha ficha", "minha ficha", "a minha faixa", "minha faixa 🥋"])("reconhece %j", (texto) =>
    expect(isPerfil(texto)).toBe(true),
  );
  it.each(["perfil de instagram", "qual é a faixa do meu filho", "ficha"])("não confunde %j", (texto) =>
    expect(isPerfil(texto)).toBe(false),
  );
});
