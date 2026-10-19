import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { filaDe, inject } from "../helpers/app";

const sb = db();

beforeAll(() => {
  resetDb();
});

describe("Jornada G — passagem de mão e regresso (AC-3, metade da app)", () => {
  it("com humano_ate no passado, a lead é retomada e o passo é perguntado de novo", async () => {
    const { phone, id } = FIXTURES.leads.emProgresso; // Bruno, passo horario
    await sb
      .from("dlbjj_leads")
      .update({ paused: true, status: "humano", human_reason: "Daniel respondeu pelo telemóvel", humano_ate: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", id);
    await inject({ from: phone, text: "olá, ainda aí?" });
    const { data: lead } = await sb.from("dlbjj_leads").select("paused,status,humano_ate,step").eq("id", id).single();
    expect(lead).toMatchObject({ paused: false, status: "em_progresso", humano_ate: null, step: "horario" });
    const fila = await filaDe(sb, phone);
    expect(fila.at(-1)!.corpo).toContain("horários disponíveis");
    expect(fila.at(-1)!.corpo).toContain("1. ");
  });

  it("com humano_ate no futuro, o bot fica calado", async () => {
    const { phone, id } = FIXTURES.leads.emProgresso;
    await sb
      .from("dlbjj_leads")
      .update({ paused: true, status: "humano", humano_ate: new Date(Date.now() + 3_600_000).toISOString() })
      .eq("id", id);
    const antes = (await filaDe(sb, phone)).length;
    await inject({ from: phone, text: "1" });
    expect((await filaDe(sb, phone)).length).toBe(antes);
  });

  it("pausada para humano, um check-in continua a ser registado", async () => {
    const { phone, id } = FIXTURES.alunos.ana;
    await sb.from("dlbjj_leads").insert({ phone, name: "Ana Silva", step: "concluido", status: "humano", paused: true, humano_ate: new Date(Date.now() + 3_600_000).toISOString() });
    await inject({ from: phone, text: "presente", agora: "2026-11-03T20:10:00Z" }); // terça: só a das 20:00
    const { data } = await sb.from("dlbjj_presencas").select("data").eq("aluno_id", id).eq("data", "2026-11-03");
    expect(data).toHaveLength(1);
  });
});
