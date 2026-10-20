import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, resetDb } from "../helpers/db";
import { PROD_URL, startProdApp } from "../helpers/prod";

const sb = db();
let app: { stop: () => Promise<void> };

beforeAll(async () => {
  resetDb();
  app = await startProdApp();
}, 300_000);
afterAll(async () => {
  await app.stop();
});

describe("Produção sem segredos: tudo fechado (AC-11)", () => {
  it("POST /api/agent/inbound sem token → 503 e nada escrito", async () => {
    const r = await fetch(`${PROD_URL}/api/agent/inbound`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ from: "351900000701", text: "Olá" }) });
    expect(r.status).toBe(503);
    const { data } = await sb.from("dlbjj_leads").select("id").eq("phone", "351900000701");
    expect(data).toEqual([]);
  });

  it("GET /api/cron/reativacao sem bearer → 503", async () => {
    const r = await fetch(`${PROD_URL}/api/cron/reativacao`);
    expect(r.status).toBe(503);
    expect((await fetch(`${PROD_URL}/api/cron/anonimizar`)).status).toBe(503);
  });

  it("POST /api/sim/inject → 404", async () => {
    const r = await fetch(`${PROD_URL}/api/sim/inject`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ from: "351900000702", text: "Olá" }) });
    expect(r.status).toBe(404);
    const { data } = await sb.from("dlbjj_leads").select("id").eq("phone", "351900000702");
    expect(data).toEqual([]);
  });

  it("GET /painel → 307 para o login; o login sem password configurada não entra", async () => {
    const r = await fetch(`${PROD_URL}/painel`, { redirect: "manual" });
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toContain("/painel/login");
    const l = await fetch(`${PROD_URL}/api/painel/login`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "password=qualquer", redirect: "manual" });
    expect(l.headers.get("location")).toContain("erro=1");
  });

  it("área do aluno em produção: /aluno → 307; entrar abre; número desconhecido não escreve nada; eventos do painel → 401", async () => {
    const r = await fetch(`${PROD_URL}/aluno`, { redirect: "manual" });
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toContain("/aluno/entrar");
    expect((await fetch(`${PROD_URL}/aluno/entrar`)).status).toBe(200);
    const form = { "content-type": "application/x-www-form-urlencoded" };
    const c = await fetch(`${PROD_URL}/api/aluno/codigo`, { method: "POST", headers: form, body: "telefone=351900000703", redirect: "manual" });
    expect(c.status).toBe(303);
    expect(c.headers.get("location")).toContain("passo=codigo");
    const { data } = await sb.from("dlbjj_fila_saida").select("id").eq("phone", "351900000703");
    expect(data).toEqual([]);
    const e = await fetch(`${PROD_URL}/api/aluno/entrar`, { method: "POST", headers: form, body: "codigo=123456", redirect: "manual" });
    expect(e.status).toBe(303);
    expect(e.headers.get("location")).toMatch(/\/aluno\/entrar$/);
    expect((await fetch(`${PROD_URL}/api/painel/eventos`, { method: "POST", headers: form, body: "titulo=x&dia=2026-12-01", redirect: "manual" })).status).toBe(401);
  });
});
