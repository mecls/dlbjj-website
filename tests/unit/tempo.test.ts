import { describe, expect, it } from "vitest";
import { dentroDaJanela, diaSemanaLisboa, hojeLisboa, horaLisboa } from "@/lib/tempo";

describe("hoje / dia da semana em Lisboa", () => {
  it("no dia em que o horário de verão começa (2026-03-29) é domingo", () => {
    const t = new Date("2026-03-29T00:30:00Z");
    expect(hojeLisboa(t)).toBe("2026-03-29");
    expect(diaSemanaLisboa(t)).toBe(7);
  });

  it("no dia em que o horário de verão acaba (2026-10-25) é domingo e 00:30Z já é 01:30", () => {
    const t = new Date("2026-10-25T00:30:00Z");
    expect(hojeLisboa(t)).toBe("2026-10-25");
    expect(horaLisboa(t)).toBe("01:30");
    expect(diaSemanaLisboa(t)).toBe(7);
  });

  it("2026-11-02T19:45Z é segunda-feira às 19:45", () => {
    const t = new Date("2026-11-02T19:45:00Z");
    expect(diaSemanaLisboa(t)).toBe(1);
    expect(horaLisboa(t)).toBe("19:45");
  });

  it("no verão, 23:30Z já é o dia seguinte em Lisboa", () => {
    expect(hojeLisboa(new Date("2026-07-01T23:30:00Z"))).toBe("2026-07-02");
    expect(horaLisboa(new Date("2026-07-01T23:30:00Z"))).toBe("00:30");
  });
});

describe("dentroDaJanela 09:00–21:00", () => {
  it.each([
    ["2026-11-03T08:59:00Z", false],
    ["2026-11-03T09:00:00Z", true],
    ["2026-11-03T20:59:00Z", true],
    ["2026-11-03T21:00:00Z", false],
    ["2026-07-01T07:59:00Z", false], // 08:59 em Lisboa (verão)
    ["2026-07-01T08:00:00Z", true], // 09:00 em Lisboa
    ["2026-07-01T20:00:00Z", false], // 21:00 em Lisboa
  ])("%s → %s", (iso, esperado) => {
    expect(dentroDaJanela("09:00", "21:00", new Date(iso))).toBe(esperado);
  });
});
