import { describe, expect, it } from "vitest";
import { decidir, type Contexto, type LinhaFila } from "../src/outbound/gates";

const base: Contexto = {
  agora: new Date("2026-11-03T10:00:00Z"), // terça, 10:00 Lisboa
  botLigado: true,
  optOut: false,
  janela: { inicio: "09:00", fim: "21:00" },
  proativasHoje: 0,
  tecto: 10,
  restricaoAte: null,
};
const linha = (kind: LinhaFila["kind"]): LinhaFila => ({ id: "f1", kind, phone: "351911111111", tentativas: 0 });

describe("decidir (portas do envio)", () => {
  it("uma mensagem do Daniel sai mesmo com o bot desligado", () => {
    expect(decidir(linha("humano"), { ...base, botLigado: false })).toEqual({ acao: "enviar" });
  });

  it("bot desligado cancela respostas, sistema e proativas", () => {
    for (const k of ["resposta", "sistema", "proativa"] as const) {
      expect(decidir(linha(k), { ...base, botLigado: false })).toEqual({ acao: "cancelar", motivo: "interruptor desligado" });
    }
  });

  it("opt-out cancela uma proativa e deixa passar uma resposta", () => {
    expect(decidir(linha("proativa"), { ...base, optOut: true })).toEqual({ acao: "cancelar", motivo: "opt-out" });
    expect(decidir(linha("resposta"), { ...base, optOut: true })).toEqual({ acao: "enviar" });
  });

  it("fora da janela, uma proativa espera pelas 09:00 seguintes; uma resposta sai às 23:00", () => {
    const noite = new Date("2026-11-03T21:30:00Z");
    expect(decidir(linha("proativa"), { ...base, agora: noite })).toEqual({ acao: "adiar", ate: new Date("2026-11-04T09:00:00Z"), motivo: "fora da janela" });
    const cedo = new Date("2026-11-03T08:30:00Z");
    expect(decidir(linha("proativa"), { ...base, agora: cedo })).toEqual({ acao: "adiar", ate: new Date("2026-11-03T09:00:00Z"), motivo: "fora da janela" });
    expect(decidir(linha("resposta"), { ...base, agora: noite })).toEqual({ acao: "enviar" });
  });

  it("no verão a janela é em hora de Lisboa (09:00 = 08:00Z)", () => {
    expect(decidir(linha("proativa"), { ...base, agora: new Date("2026-07-01T07:30:00Z") })).toMatchObject({ acao: "adiar", ate: new Date("2026-07-01T08:00:00Z") });
  });

  it("com o teto do dia atingido, uma proativa espera pelo dia seguinte", () => {
    expect(decidir(linha("proativa"), { ...base, proativasHoje: 10 })).toEqual({ acao: "adiar", ate: new Date("2026-11-04T09:00:00Z"), motivo: "teto diário" });
    expect(decidir(linha("resposta"), { ...base, proativasHoje: 10 })).toEqual({ acao: "enviar" });
  });

  it("uma restrição do WhatsApp adia as proativas até acabar", () => {
    const ate = new Date("2026-11-03T10:45:00Z");
    expect(decidir(linha("proativa"), { ...base, restricaoAte: ate })).toEqual({ acao: "adiar", ate, motivo: "restrição do WhatsApp" });
    expect(decidir(linha("resposta"), { ...base, restricaoAte: ate })).toEqual({ acao: "enviar" });
  });

  it("com tudo em ordem, envia", () => {
    expect(decidir(linha("proativa"), base)).toEqual({ acao: "enviar" });
  });
});
