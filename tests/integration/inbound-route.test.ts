import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { db, resetDb } from "../helpers/db";

const sb = db();

function pedido(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/agent/inbound", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeAll(() => {
  resetDb();
});

const envOriginal = { ...process.env };
const env = process.env as Record<string, string | undefined>;
afterEach(() => {
  env.NODE_ENV = envOriginal.NODE_ENV;
  env.VERCEL_ENV = envOriginal.VERCEL_ENV;
  env.DLBJJ_WORKER_TOKEN = envOriginal.DLBJJ_WORKER_TOKEN;
});

describe("POST /api/agent/inbound", () => {
  it("sem token → 401 e nada é escrito", async () => {
    const { POST } = await import("@/app/api/agent/inbound/route");
    const r = await POST(pedido({ from: "351900000201", text: "Olá" }));
    expect(r.status).toBe(401);
    const { data } = await sb.from("dlbjj_leads").select("id").eq("phone", "351900000201");
    expect(data).toEqual([]);
  });

  it("token errado → 401", async () => {
    const { POST } = await import("@/app/api/agent/inbound/route");
    const r = await POST(pedido({ from: "351900000201", text: "Olá" }, { "x-dlbjj-token": "errado" }));
    expect(r.status).toBe(401);
  });

  it("em produção sem DLBJJ_WORKER_TOKEN → 503", async () => {
    env.NODE_ENV = "production";
    env.VERCEL_ENV = "production";
    env.DLBJJ_WORKER_TOKEN = "";
    const { POST } = await import("@/app/api/agent/inbound/route");
    const r = await POST(pedido({ from: "351900000201", text: "Olá" }, { "x-dlbjj-token": "" }));
    expect(r.status).toBe(503);
  });

  it("corpo inválido → 400", async () => {
    const { POST } = await import("@/app/api/agent/inbound/route");
    const r = await POST(pedido({ text: "sem from" }, { "x-dlbjj-token": process.env.DLBJJ_WORKER_TOKEN! }));
    expect(r.status).toBe(400);
    const r2 = await POST(pedido("{isto não é json", { "x-dlbjj-token": process.env.DLBJJ_WORKER_TOKEN! }));
    expect(r2.status).toBe(400);
  });

  it("token certo → 200, lead criada e resposta na fila", async () => {
    const { POST } = await import("@/app/api/agent/inbound/route");
    const r = await POST(
      pedido({ from: "351900000202", text: "Olá", waMessageId: "wamid.t1", name: "Teste" }, { "x-dlbjj-token": process.env.DLBJJ_WORKER_TOKEN! }),
    );
    expect(r.status).toBe(200);
    const { data: lead } = await sb.from("dlbjj_leads").select("name,step").eq("phone", "351900000202").single();
    expect(lead).toMatchObject({ name: "Teste", step: "nome" });
    const { data: fila } = await sb.from("dlbjj_fila_saida").select("kind").eq("phone", "351900000202");
    expect(fila).toHaveLength(1);
  });

  it("a mesma waMessageId duas vezes só produz uma resposta", async () => {
    const { POST } = await import("@/app/api/agent/inbound/route");
    const h = { "x-dlbjj-token": process.env.DLBJJ_WORKER_TOKEN! };
    await POST(pedido({ from: "351900000203", text: "Olá", waMessageId: "wamid.dup" }, h));
    await POST(pedido({ from: "351900000203", text: "Olá", waMessageId: "wamid.dup" }, h));
    const { data: fila } = await sb.from("dlbjj_fila_saida").select("kind").eq("phone", "351900000203");
    expect(fila).toHaveLength(1);
  });
});
