import { afterEach, describe, expect, it } from "vitest";
import { isProduction } from "@/lib/config";

const env = process.env as Record<string, string | undefined>;
const original = { ...process.env };
afterEach(() => {
  // `env.X = undefined` guarda a string "undefined"; tem de ser delete.
  if (original.VERCEL_ENV === undefined) delete env.VERCEL_ENV;
  else env.VERCEL_ENV = original.VERCEL_ENV;
  env.NODE_ENV = original.NODE_ENV;
});

describe("isProduction", () => {
  it("qualquer deploy na Vercel (production OU preview) conta como produção para as portas", () => {
    env.VERCEL_ENV = "production";
    expect(isProduction()).toBe(true);
    env.VERCEL_ENV = "preview";
    expect(isProduction()).toBe(true);
  });
  it("fora da Vercel, só NODE_ENV=production", () => {
    delete env.VERCEL_ENV;
    env.NODE_ENV = "production";
    expect(isProduction()).toBe(true);
    env.NODE_ENV = "test";
    expect(isProduction()).toBe(false);
  });
  it("`vercel dev` local não é produção", () => {
    env.VERCEL_ENV = "development";
    env.NODE_ENV = "development";
    expect(isProduction()).toBe(false);
  });
});
