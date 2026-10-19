import { beforeAll, describe, expect, it } from "vitest";
import { permitido } from "@/lib/limites";
import { db, resetDb } from "../helpers/db";

const sb = db();

beforeAll(() => {
  resetDb();
});

describe("limites de pedidos", () => {
  it("deixa passar 5 tentativas de login em 15 min e trava a 6.ª", async () => {
    for (let i = 0; i < 5; i++) expect(await permitido("login", "1.2.3.4", 5, 900), `tentativa ${i + 1}`).toBe(true);
    expect(await permitido("login", "1.2.3.4", 5, 900)).toBe(false);
    expect(await permitido("login", "5.6.7.8", 5, 900)).toBe(true); // outro IP
    expect(await permitido("publico", "1.2.3.4", 10, 60)).toBe(true); // outra rota
  });

  it("quando a janela expira, conta de novo", async () => {
    await sb.from("dlbjj_limites").update({ expira_em: new Date(Date.now() - 1000).toISOString() }).eq("chave", "login:1.2.3.4:900");
    expect(await permitido("login", "1.2.3.4", 5, 900)).toBe(true);
    const { data } = await sb.from("dlbjj_limites").select("contagem").eq("chave", "login:1.2.3.4:900").single();
    expect(data!.contagem).toBe(1);
  });
});
