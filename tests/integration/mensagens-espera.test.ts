import { beforeAll, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { conversasAEspera } from "@/lib/painel/mensagens";

const sb = db();
beforeAll(() => {
  resetDb();
});

it("conta só as pausadas/humano cuja última mensagem (da pessoa ou do Daniel) é da pessoa", async () => {
  const { emProgresso, concluido } = FIXTURES.leads;
  expect((await conversasAEspera()).total).toBe(0);
  await sb.from("dlbjj_leads").update({ paused: true, status: "humano" }).eq("id", emProgresso.id);
  await sb.from("dlbjj_mensagens").insert({ lead_id: emProgresso.id, phone: emProgresso.phone, direction: "in", role: "lead", body: "Olá?" });
  expect(await conversasAEspera()).toEqual({ total: 1, phones: [emProgresso.phone] });
  await sb.from("dlbjj_mensagens").insert({ lead_id: emProgresso.id, phone: emProgresso.phone, direction: "out", role: "bot", body: "O teu código é *123456*" });
  expect((await conversasAEspera()).total).toBe(1); // um código não é o Daniel a responder
  await sb.from("dlbjj_mensagens").insert({ lead_id: emProgresso.id, phone: emProgresso.phone, direction: "out", role: "humano", body: "Olá!" });
  expect((await conversasAEspera()).total).toBe(0);
  await sb.from("dlbjj_mensagens").insert({ lead_id: concluido.id, phone: concluido.phone, direction: "in", role: "lead", body: "?" }); // não pausada → não conta
  expect((await conversasAEspera()).total).toBe(0);
});
