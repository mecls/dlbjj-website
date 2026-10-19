import { beforeAll, describe, expect, it } from "vitest";
import { sendOutbound } from "@/lib/bot/outbound";
import { db, resetDb } from "../helpers/db";

const sb = db();

beforeAll(() => {
  resetDb();
});

describe("sendOutbound com corpo longo", () => {
  it("cria uma linha da fila por parte, pela ordem, com alguns segundos entre elas", async () => {
    const corpo = ["a".repeat(800), "b".repeat(700), "c".repeat(100)].join("\n\n");
    await sendOutbound({ leadId: null, to: "351900000811", role: "bot", body: corpo });
    const { data } = await sb.from("dlbjj_fila_saida").select("corpo,enviar_apos").eq("phone", "351900000811").order("enviar_apos");
    expect(data).toHaveLength(2);
    expect(data![0].corpo).toBe("a".repeat(800));
    expect(data![1].corpo).toBe(`${"b".repeat(700)}\n\n${"c".repeat(100)}`);
    expect(new Date(data![1].enviar_apos).getTime() - new Date(data![0].enviar_apos).getTime()).toBeGreaterThanOrEqual(2_000);
    const { data: msgs } = await sb.from("dlbjj_mensagens").select("body").eq("phone", "351900000811");
    expect(msgs).toHaveLength(2);
  });
});
