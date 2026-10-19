import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BACKOFF_ENTRADAS_MS, encaminhar, retomarFalhadas } from "../src/inbound/forward";
import { db, resetDb, startStubApp, type StubApp } from "./helpers";

const sb = db();
let app: StubApp;
const ctx = () => ({ db: sb, appBaseUrl: app.url, token: "tok", timeoutMs: 2_000 });

beforeAll(async () => {
  resetDb();
  app = await startStubApp();
});
afterAll(async () => {
  await app.close();
});

async function falhada(deliveryId: string) {
  const { data } = await sb.from("dlbjj_entradas_falhadas").select("*").eq("delivery_id", deliveryId).maybeSingle();
  return data;
}

describe("encaminhar para a app", () => {
  it("app responde 200 → ok, com o token e o corpo certos, sem carta morta", async () => {
    const r = await encaminhar(ctx(), { phone: "351911111111", text: "Olá", id: "wamid.1", name: "Rita" }, "del-1");
    expect(r).toBe("ok");
    const p = app.pedidos.at(-1)!;
    expect(p.headers["x-dlbjj-token"]).toBe("tok");
    expect(p.body).toEqual({ from: "351911111111", text: "Olá", waMessageId: "wamid.1", name: "Rita" });
    expect(await falhada("del-1")).toBeNull();
  });

  it("app em baixo → carta morta com a primeira tentativa marcada para daqui a 30 s", async () => {
    const semApp = { ...ctx(), appBaseUrl: "http://127.0.0.1:1" };
    const antes = Date.now();
    const r = await encaminhar(semApp, { phone: "351911111112", text: "Olá", id: "wamid.2" }, "del-2");
    expect(r).toBe("falhou");
    const f = (await falhada("del-2"))!;
    expect(f.tentativas).toBe(1);
    expect(new Date(f.proxima_em).getTime()).toBeGreaterThanOrEqual(antes + BACKOFF_ENTRADAS_MS[0] - 1000);
    expect(f.erro).toBeTruthy();
    expect(f.payload).toMatchObject({ from: "351911111112", text: "Olá" });
  });

  it("app responde 500 → carta morta", async () => {
    app.modo = { status: 500 };
    const r = await encaminhar(ctx(), { phone: "351911111113", text: "Olá", id: "wamid.3" }, "del-3");
    app.modo = { status: 200 };
    expect(r).toBe("falhou");
    expect((await falhada("del-3"))!.tentativas).toBe(1);
  });

  it("retomar: quando a app volta, a carta morta fica resolvida", async () => {
    await sb.from("dlbjj_entradas_falhadas").update({ proxima_em: new Date(Date.now() - 1000).toISOString() }).eq("delivery_id", "del-2");
    const n = app.pedidos.length;
    const r = await retomarFalhadas(ctx());
    expect(r.resolvidas).toBe(1);
    expect(app.pedidos.length).toBe(n + 1);
    expect((await falhada("del-2"))!.resolvida_em).not.toBeNull();
  });

  it("retomar: falha outra vez → 2.ª tentativa daqui a 5 min; à 4.ª fica sinalizada e não volta a tentar", async () => {
    await sb.from("dlbjj_entradas_falhadas").update({ proxima_em: new Date(Date.now() - 1000).toISOString() }).eq("delivery_id", "del-3");
    app.modo = { status: 500 };
    await retomarFalhadas(ctx());
    let f = (await falhada("del-3"))!;
    expect(f.tentativas).toBe(2);
    expect(new Date(f.proxima_em).getTime()).toBeGreaterThan(Date.now() + BACKOFF_ENTRADAS_MS[1] - 5000);

    await sb.from("dlbjj_entradas_falhadas").update({ tentativas: 3, proxima_em: new Date(Date.now() - 1000).toISOString() }).eq("delivery_id", "del-3");
    await retomarFalhadas(ctx());
    f = (await falhada("del-3"))!;
    expect(f.tentativas).toBe(4);

    await sb.from("dlbjj_entradas_falhadas").update({ proxima_em: new Date(Date.now() - 1000).toISOString() }).eq("delivery_id", "del-3");
    const n = app.pedidos.length;
    const r = await retomarFalhadas(ctx());
    app.modo = { status: 200 };
    expect(r.tentadas).toBe(0);
    expect(app.pedidos.length).toBe(n);
  });
});
