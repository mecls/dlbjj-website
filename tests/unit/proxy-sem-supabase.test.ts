import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

/**
 * Em produção sem Supabase (as chaves ainda por pôr na Vercel) um link com
 * token não pode rebentar com 500: fecha com a página de "não encontrado".
 */
const env = process.env as Record<string, string | undefined>;
const guardadas: Record<string, string | undefined> = {};
beforeEach(() => {
  for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    guardadas[k] = env[k];
    delete env[k];
  }
});
afterEach(() => {
  for (const [k, v] of Object.entries(guardadas)) if (v !== undefined) env[k] = v;
});

describe("proxy sem Supabase", () => {
  it("reescreve um link com token para a página de não encontrado em vez de rebentar", async () => {
    for (const path of ["/inscricao/abcdefghijklmnopqrstuvwxyz1234", "/aluno/abcdefghijklmnopqrstuvwxyz1234"]) {
      const r = await proxy(new NextRequest(`https://www.dlbjj.org${path}`));
      const destino = r.headers.get("x-middleware-rewrite") ?? "";
      expect(destino, path).toContain("/api/link-invalido");
      expect(destino, path).toContain("motivo=desconhecido");
    }
  });
  it("deixa passar o que não é token", async () => {
    const r = await proxy(new NextRequest("https://www.dlbjj.org/aluno/entrar"));
    expect(r.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
