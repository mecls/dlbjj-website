import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { db, resetDb } from "../helpers/db";

const sb = db();
const env = process.env as Record<string, string | undefined>;
const original = { ...process.env };

function pedido(auth?: string): NextRequest {
  return new NextRequest("http://localhost/api/cron/reativacao", { headers: auth ? { authorization: auth } : {} });
}

beforeAll(async () => {
  resetDb();
  // 12 alunos ativos sem presenças, a treinar há mais de 14 dias.
  const linhas = Array.from({ length: 12 }, (_, i) => ({
    nome: `Aluno Silencioso ${i + 1}`,
    phone: `35193100${String(i + 1).padStart(4, "0")}`,
    publico: "adulto",
    modalidade: "jiu-jitsu",
    local_slug: "sao-bras",
    inicio_em: "2026-09-01",
    estado: "ativo",
    consentimento_rgpd_em: new Date().toISOString(),
  }));
  const { error } = await sb.from("dlbjj_alunos").insert(linhas);
  if (error) throw error;
});
afterEach(() => {
  env.NODE_ENV = original.NODE_ENV;
  env.VERCEL_ENV = original.VERCEL_ENV;
  env.CRON_SECRET = original.CRON_SECRET;
});

describe("GET /api/cron/reativacao (AC-7, metade da app)", () => {
  it("sem bearer → 401; bearer errado → 401", async () => {
    const { GET } = await import("@/app/api/cron/reativacao/route");
    expect((await GET(pedido())).status).toBe(401);
    expect((await GET(pedido("Bearer errado"))).status).toBe(401);
  });

  it("em produção sem CRON_SECRET → 503", async () => {
    env.NODE_ENV = "production";
    env.VERCEL_ENV = "production";
    env.CRON_SECRET = "";
    const { GET } = await import("@/app/api/cron/reativacao/route");
    expect((await GET(pedido("Bearer "))).status).toBe(503);
  });

  it("duas corridas seguidas criam exatamente 12 toques R4 (mais R1 e R3 das leads do seed), não 24", async () => {
    const { GET } = await import("@/app/api/cron/reativacao/route");
    const r1 = await GET(pedido(`Bearer ${process.env.CRON_SECRET}`));
    expect(r1.status).toBe(200);
    const corpo1 = (await r1.json()) as { toques: number };
    expect(corpo1.toques).toBe(14);
    const r2 = await GET(pedido(`Bearer ${process.env.CRON_SECRET}`));
    expect(((await r2.json()) as { toques: number }).toques).toBe(0);

    const { data: toques } = await sb.from("dlbjj_toques").select("regra,estado,fila_id");
    expect(toques!.filter((t) => t.regra === "R4")).toHaveLength(12);
    expect(toques!.filter((t) => t.regra === "R3")).toHaveLength(1);
    expect(toques!.filter((t) => t.regra === "R1")).toHaveLength(1);
    expect(toques!.every((t) => t.estado === "na_fila" && t.fila_id)).toBe(true);

    const { data: fila } = await sb.from("dlbjj_fila_saida").select("kind,regra,enviar_apos,estado").eq("kind", "proativa");
    expect(fila).toHaveLength(14);
    const agora = Date.now();
    for (const f of fila!) {
      const t = new Date(f.enviar_apos).getTime();
      expect(t).toBeGreaterThanOrEqual(agora - 60_000);
      expect(t).toBeLessThanOrEqual(agora + 3 * 3_600_000 + 60_000);
      expect(f.estado).toBe("pendente");
    }
  });

  it("uma resposta da pessoa fica registada no toque e na lead", async () => {
    const { handleInbound } = await import("@/lib/bot/handle-inbound");
    await handleInbound({ from: "351910000003", text: "sim, quero marcar outra vez" }); // Carla, R3
    const { data: t } = await sb.from("dlbjj_toques").select("respondeu_em").eq("phone", "351910000003").eq("regra", "R3").single();
    expect(t!.respondeu_em).not.toBeNull();
    const { data: l } = await sb.from("dlbjj_leads").select("respondeu_regra_em,ultima_regra").eq("phone", "351910000003").single();
    expect(l!.ultima_regra).toBe("R3");
    expect(l!.respondeu_regra_em).not.toBeNull();
  });
});
