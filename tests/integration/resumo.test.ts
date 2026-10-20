import { beforeAll, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { gerarResumo, lerResumo } from "@/lib/painel/resumo";

const sb = db();
beforeAll(() => {
  resetDb();
});

it("gera com o fake, guarda em dlbjj_resumos sem tocar em updated_at, e deteta conversa nova", async () => {
  const { emProgresso } = FIXTURES.leads;
  const { data: antes } = await sb.from("dlbjj_leads").select("updated_at").eq("id", emProgresso.id).single();
  expect(await gerarResumo(emProgresso.id, emProgresso.phone)).toBe("sem_conversa");
  await sb.from("dlbjj_mensagens").insert({ lead_id: emProgresso.id, phone: emProgresso.phone, direction: "in", role: "lead", body: "quero treinar jiu-jitsu em São Brás, o código *123456*" });
  expect(await gerarResumo(emProgresso.id, emProgresso.phone)).toBe("ok");
  const ultima = (await sb.from("dlbjj_mensagens").select("created_at").eq("phone", emProgresso.phone).order("created_at", { ascending: false }).limit(1).single()).data!.created_at;
  const { resumo, desatualizado } = await lerResumo(emProgresso.id, ultima);
  expect(resumo!.situacao).toContain("*[código]*"); // o fake ecoa a última mensagem já redigida
  expect(resumo!.mensagens).toBe(1);
  expect(desatualizado).toBe(false);
  const { data: depois } = await sb.from("dlbjj_leads").select("updated_at").eq("id", emProgresso.id).single();
  expect(depois!.updated_at).toBe(antes!.updated_at);
  await new Promise((r) => setTimeout(r, 20));
  const { data: nova } = await sb.from("dlbjj_mensagens").insert({ lead_id: emProgresso.id, phone: emProgresso.phone, direction: "in", role: "lead", body: "e para crianças?" }).select("created_at").single();
  expect((await lerResumo(emProgresso.id, nova!.created_at)).desatualizado).toBe(true);
  await sb.from("dlbjj_mensagens").insert({ lead_id: emProgresso.id, phone: emProgresso.phone, direction: "in", role: "lead", body: "[[lixo]]" });
  expect(await gerarResumo(emProgresso.id, emProgresso.phone)).toBe("resumo");
  expect((await lerResumo(emProgresso.id, null)).resumo!.mensagens).toBe(1); // o anterior ficou
});
