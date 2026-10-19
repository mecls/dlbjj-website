import { describe, expect, it } from "vitest";
import { avaliarToken, gerarToken, hashToken } from "@/lib/tokens";

const agora = new Date("2026-11-03T10:00:00Z");
const base = {
  token_hash: "x",
  kind: "inscricao" as const,
  lead_id: "l1",
  aluno_id: null,
  expira_em: "2026-11-10T10:00:00Z",
  usado_em: null,
  revogado_em: null,
};

describe("gerarToken / hashToken", () => {
  it("gera 43 caracteres base64url, sempre diferentes", () => {
    const a = gerarToken();
    const b = gerarToken();
    expect(a).toHaveLength(43);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a).not.toBe(b);
  });

  it("o hash é sha256 hex e determinista", () => {
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("avaliarToken", () => {
  it("aceita um token válido do tipo certo", () => {
    expect(avaliarToken(base, "inscricao", agora)).toEqual({ ok: true });
  });
  it("recusa expirado", () => {
    expect(avaliarToken({ ...base, expira_em: "2026-11-01T00:00:00Z" }, "inscricao", agora)).toEqual({ ok: false, motivo: "expirado" });
  });
  it("recusa um token de inscrição já usado", () => {
    expect(avaliarToken({ ...base, usado_em: "2026-11-02T00:00:00Z" }, "inscricao", agora)).toEqual({ ok: false, motivo: "usado" });
  });
  it("um token de perfil pode ser reutilizado até expirar", () => {
    const perfil = { ...base, kind: "perfil" as const, lead_id: null, aluno_id: "a1", usado_em: "2026-11-02T00:00:00Z" };
    expect(avaliarToken(perfil, "perfil", agora)).toEqual({ ok: true });
  });
  it("recusa revogado", () => {
    expect(avaliarToken({ ...base, revogado_em: "2026-11-02T00:00:00Z" }, "inscricao", agora)).toEqual({ ok: false, motivo: "revogado" });
  });
  it("recusa o tipo errado", () => {
    expect(avaliarToken(base, "perfil", agora)).toEqual({ ok: false, motivo: "tipo" });
  });
  it("recusa o que não existe", () => {
    expect(avaliarToken(null, "perfil", agora)).toEqual({ ok: false, motivo: "desconhecido" });
  });
});
