import { describe, expect, it } from "vitest";
import { nifValido, validarInscricao } from "@/lib/inscricao/validar";

const HOJE = new Date("2026-11-03T10:00:00Z");

const adulto = {
  nome: "Ana Silva",
  data_nascimento: "1992-04-12",
  phone: "351920000001",
  email: "ana@example.com",
  nif: "123456789",
  local_slug: "sao-bras",
  modalidade: "jiu-jitsu",
  faixa: "branca",
  graus: "0",
  consentimento_rgpd: "on",
};

describe("nifValido", () => {
  it.each(["123456789", "501442600", "999999990"])("aceita %s", (nif) => expect(nifValido(nif)).toBe(true));
  it.each(["123456780", "12345678", "abcdefghi", "1234567890"])("recusa %s", (nif) => expect(nifValido(nif)).toBe(false));
});

describe("validarInscricao", () => {
  it("um adulto completo passa e fica com publico = adulto", () => {
    const r = validarInscricao(adulto, HOJE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dados.publico).toBe("adulto");
      expect(r.dados.nif).toBe("123456789");
      expect(r.dados.consentimento_imagem).toBe(false);
    }
  });

  it("um menor sem encarregado de educação é recusado com a mensagem certa", () => {
    const r = validarInscricao({ ...adulto, data_nascimento: "2015-05-01" }, HOJE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.enc_nome).toBe("Para menores é obrigatório o encarregado de educação");
  });

  it("um menor com encarregado passa e fica kids", () => {
    const r = validarInscricao({ ...adulto, data_nascimento: "2015-05-01", enc_nome: "Marta", enc_telefone: "351911111111", enc_relacao: "mãe" }, HOJE);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dados.publico).toBe("kids");
  });

  it("quem faz 18 anos hoje é adulto; quem os faz amanhã é menor", () => {
    expect(validarInscricao({ ...adulto, data_nascimento: "2008-11-03" }, HOJE).ok).toBe(true);
    expect(validarInscricao({ ...adulto, data_nascimento: "2008-11-04" }, HOJE).ok).toBe(false);
  });

  it("sem consentimento RGPD é recusado", () => {
    const r = validarInscricao({ ...adulto, consentimento_rgpd: "" }, HOJE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.consentimento_rgpd).toMatch(/RGPD/);
  });

  it("NIF errado é recusado; NIF vazio é aceite", () => {
    const r = validarInscricao({ ...adulto, nif: "123456780" }, HOJE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.nif).toBe("NIF inválido");
    expect(validarInscricao({ ...adulto, nif: "" }, HOJE).ok).toBe(true);
  });

  it("data de nascimento em falta ou no futuro é recusada", () => {
    expect(validarInscricao({ ...adulto, data_nascimento: "" }, HOJE)).toMatchObject({ ok: false, erros: { data_nascimento: "Data de nascimento obrigatória" } });
    expect(validarInscricao({ ...adulto, data_nascimento: "2030-01-01" }, HOJE).ok).toBe(false);
  });

  it("um número português de 9 dígitos ganha o indicativo 351; outros formatos curtos são recusados", () => {
    const r = validarInscricao({ ...adulto, phone: "912 345 678", enc_telefone: "961111111" }, HOJE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dados.phone).toBe("351912345678");
      expect(r.dados.enc_telefone).toBe("351961111111");
    }
    expect(validarInscricao({ ...adulto, phone: "+351 912 345 678" }, HOJE)).toMatchObject({ ok: true, dados: { phone: "351912345678" } });
    expect(validarInscricao({ ...adulto, phone: "00351912345678" }, HOJE)).toMatchObject({ ok: true, dados: { phone: "351912345678" } });
    expect(validarInscricao({ ...adulto, phone: "212345678" }, HOJE)).toMatchObject({ ok: false, erros: { phone: "Telemóvel inválido — inclui o indicativo (ex.: 351912345678)" } });
    expect(validarInscricao({ ...adulto, phone: "12345" }, HOJE).ok).toBe(false);
  });

  it("espaço, modalidade e faixa desconhecidos são recusados", () => {
    expect(validarInscricao({ ...adulto, local_slug: "lisboa" }, HOJE).ok).toBe(false);
    expect(validarInscricao({ ...adulto, modalidade: "boxe" }, HOJE).ok).toBe(false);
    expect(validarInscricao({ ...adulto, faixa: "dourada" }, HOJE).ok).toBe(false);
  });
});
