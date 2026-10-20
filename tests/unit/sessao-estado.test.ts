import { describe, expect, it } from "vitest";
import { estadoDaSessao } from "@/lib/painel/sessao-estado";

const agora = new Date("2026-10-20T12:00:00Z");
const ha = (min: number) => new Date(agora.getTime() - min * 60_000).toISOString();

describe("estadoDaSessao", () => {
  it("ligada com batimento recente não alerta", () => {
    expect(estadoDaSessao({ estado: "ligado", visto_em: ha(2) }, agora, true)).toEqual({ estado: "ligada", alerta: false });
  });
  it("ligada mas sem sinal há mais de 10 min alerta", () => {
    expect(estadoDaSessao({ estado: "ligado", visto_em: ha(11) }, agora, false)).toEqual({ estado: "sem_sinal", alerta: true });
  });
  it("instável e caída alertam", () => {
    expect(estadoDaSessao({ estado: "instavel", visto_em: ha(1) }, agora, false).alerta).toBe(true);
    expect(estadoDaSessao({ estado: "caido", visto_em: ha(1) }, agora, false)).toEqual({ estado: "caida", alerta: true });
  });
  it("sem linha: alerta só em produção", () => {
    expect(estadoDaSessao(null, agora, true)).toEqual({ estado: "nunca", alerta: true });
    expect(estadoDaSessao(null, agora, false)).toEqual({ estado: "nunca", alerta: false });
  });
});
