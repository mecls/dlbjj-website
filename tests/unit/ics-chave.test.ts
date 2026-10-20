import { afterEach, describe, expect, it } from "vitest";
import { chaveIcs, chaveValida } from "@/lib/painel/ics-chave";

const env = process.env as Record<string, string | undefined>;
const original = env.DASHBOARD_PASSWORD;
afterEach(() => {
  if (original === undefined) delete env.DASHBOARD_PASSWORD;
  else env.DASHBOARD_PASSWORD = original;
});

describe("chave do feed ICS", () => {
  it("deriva da password e valida em tempo constante", () => {
    env.DASHBOARD_PASSWORD = "teste";
    const chave = chaveIcs();
    expect(chave).toMatch(/^[0-9a-f]{64}$/);
    expect(chaveValida(chave)).toBe(true);
    expect(chaveValida("x")).toBe(false);
    expect(chaveValida(null)).toBe(false);
  });
  it("sem password não há chave", () => {
    delete env.DASHBOARD_PASSWORD;
    expect(chaveIcs()).toBeNull();
    expect(chaveValida("")).toBe(false);
  });
});
