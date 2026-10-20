import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { db, resetDb } from "../helpers/db";
import { chaveValida, criarChaveIcs, obterChaveIcs } from "@/lib/painel/ics-chave";

const sb = db();
const env = process.env as Record<string, string | undefined>;
const original = env.DASHBOARD_PASSWORD;
beforeAll(() => {
  resetDb();
});
afterEach(() => {
  if (original === undefined) delete env.DASHBOARD_PASSWORD;
  else env.DASHBOARD_PASSWORD = original;
});

describe("chave do feed ICS", () => {
  it("é um segredo aleatório guardado nas definições, estável entre chamadas, e não deriva da password", async () => {
    env.DASHBOARD_PASSWORD = "teste";
    const chave = await obterChaveIcs();
    expect(chave).toMatch(/^[0-9a-f]{64}$/);
    expect(await obterChaveIcs()).toBe(chave);
    const { data } = await sb.from("dlbjj_settings").select("value").eq("key", "ics_chave").single();
    expect(data!.value).toBe(chave);
    expect(await chaveValida(chave)).toBe(true);
    expect(await chaveValida("x")).toBe(false);
    expect(await chaveValida(null)).toBe(false);
    expect(await chaveValida("é" + "a".repeat(63))).toBe(false); // mesmo comprimento em JS, mais bytes: não pode rebentar
  });
  it("gerar uma chave nova invalida a anterior", async () => {
    env.DASHBOARD_PASSWORD = "teste";
    const antiga = await obterChaveIcs();
    const nova = await criarChaveIcs();
    expect(nova).not.toBe(antiga);
    expect(await obterChaveIcs()).toBe(nova);
    expect(await chaveValida(antiga)).toBe(false);
    expect(await chaveValida(nova)).toBe(true);
  });
  it("sem password do painel não há feed", async () => {
    delete env.DASHBOARD_PASSWORD;
    expect(await obterChaveIcs()).toBeNull();
    expect(await chaveValida("")).toBe(false);
  });
});
