import { beforeAll, describe, expect, it } from "vitest";
import { comRetrocesso } from "@/lib/bot/retrocesso";
import { db, resetDb } from "../helpers/db";

const sb = db();

beforeAll(() => {
  resetDb();
});

describe("comRetrocesso — uma entrada que falha a meio não fica perdida", () => {
  it("se o trabalho falhar, a linha de idempotência é apagada e o erro sobe (o worker volta a tentar)", async () => {
    const { data: m } = await sb.from("dlbjj_mensagens").insert({ phone: "351900000801", direction: "in", role: "lead", body: "x", wa_message_id: "wamid.rb-1" }).select("id").single();
    await expect(comRetrocesso(m!.id, async () => { throw new Error("BD soluçou"); })).rejects.toThrow("BD soluçou");
    const { data } = await sb.from("dlbjj_mensagens").select("id").eq("id", m!.id);
    expect(data).toEqual([]);
  });
  it("se correr bem, a linha fica", async () => {
    const { data: m } = await sb.from("dlbjj_mensagens").insert({ phone: "351900000802", direction: "in", role: "lead", body: "x", wa_message_id: "wamid.rb-2" }).select("id").single();
    await expect(comRetrocesso(m!.id, async () => "ok")).resolves.toBe("ok");
    const { data } = await sb.from("dlbjj_mensagens").select("id").eq("id", m!.id);
    expect(data).toHaveLength(1);
  });
});
