import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { filaDe, inject } from "../helpers/app";

const sb = db();
const SEG_1945 = "2026-11-02T19:45:00Z"; // segunda, 19:45 em Lisboa
const SEG_1840 = "2026-11-02T18:40:00Z";
const TER_0810 = "2026-11-03T08:10:00Z";
const DOM = "2026-11-01T12:00:00Z";

async function presencas(alunoId: string) {
  const { data } = await sb.from("dlbjj_presencas").select("data,origem,turma_id,dlbjj_turmas(horario,turma)").eq("aluno_id", alunoId).order("data");
  return data ?? [];
}

beforeAll(() => {
  resetDb();
});

describe("Jornada C — check-in (AC-6)", () => {
  it("segunda às 19:45 em São Brás lista as 4 aulas de JJ e '3' regista a das 19:30", async () => {
    const { phone, id } = FIXTURES.alunos.ana;
    await inject({ from: phone, text: "presente", agora: SEG_1945 });
    let fila = await filaDe(sb, phone);
    const pergunta = fila.at(-1)!.corpo;
    expect(pergunta).toContain("1. 06:00");
    expect(pergunta).toContain("2. 11:00");
    expect(pergunta).toContain("3. 19:30");
    expect(pergunta).toContain("4. 20:30");
    expect(pergunta).not.toContain("MMA");

    await inject({ from: phone, text: "3", agora: SEG_1945 });
    const p = (await presencas(id)).filter((x) => x.data === "2026-11-02");
    expect(p).toHaveLength(1);
    expect(p[0].origem).toBe("whatsapp");
    expect((p[0] as unknown as { dlbjj_turmas: { horario: string } }).dlbjj_turmas.horario).toBe("19:30:00");
    fila = await filaDe(sb, phone);
    expect(fila.at(-1)!.corpo).toBe("Presença registada: Jiu-Jitsu · segunda 19:30 · São Brás. Bom treino, Ana! 🥋");
  });

  it("um segundo check-in na mesma aula não duplica", async () => {
    const { phone, id } = FIXTURES.alunos.ana;
    await inject({ from: phone, text: "presente", agora: SEG_1945 });
    await inject({ from: phone, text: "3", agora: SEG_1945 });
    expect((await presencas(id)).filter((x) => x.data === "2026-11-02")).toHaveLength(1);
    const fila = await filaDe(sb, phone);
    expect(fila.at(-1)!.corpo).toContain("Já tinhas a presença registada hoje");
  });

  it("com uma só aula hoje regista logo (Rui, terça 08:00 em Queluz)", async () => {
    const { phone, id } = FIXTURES.alunos.rui;
    await inject({ from: phone, text: "Presente 🥋", agora: TER_0810 });
    const p = (await presencas(id)).filter((x) => x.data === "2026-11-03");
    expect(p).toHaveLength(1);
    const fila = await filaDe(sb, phone);
    expect(fila.at(-1)!.corpo).toBe("Presença registada: Jiu-Jitsu (Adultos) · terça 08:00 · Queluz. Bom treino, Rui! 🥋");
  });

  it("dois irmãos no mesmo telemóvel: pergunta para quem, depois a aula, e regista os dois", async () => {
    const { phone } = FIXTURES.alunos.joao;
    await inject({ from: phone, text: "cheguei", agora: SEG_1840 });
    let fila = await filaDe(sb, phone);
    expect(fila.at(-1)!.corpo).toContain("Para quem é a presença?");
    expect(fila.at(-1)!.corpo).toContain("1. João Pereira");
    expect(fila.at(-1)!.corpo).toContain("2. Inês Pereira");
    expect(fila.at(-1)!.corpo).toContain("3. Os dois");

    await inject({ from: phone, text: "3", agora: SEG_1840 });
    fila = await filaDe(sb, phone);
    expect(fila.at(-1)!.corpo).toContain("1. 17:30");
    expect(fila.at(-1)!.corpo).toContain("2. 18:30");
    expect(fila.at(-1)!.corpo).toContain("3. 19:30");

    await inject({ from: phone, text: "2", agora: SEG_1840 });
    const pj = (await presencas(FIXTURES.alunos.joao.id)).filter((x) => x.data === "2026-11-02");
    const pi = (await presencas(FIXTURES.alunos.ines.id)).filter((x) => x.data === "2026-11-02");
    expect(pj).toHaveLength(1);
    expect(pi).toHaveLength(1);
    fila = await filaDe(sb, phone);
    expect(fila.at(-1)!.corpo).toBe("Presença registada para João e Inês: Kids · segunda 18:30 · BJJ Kids. Bom treino! 🥋");
  });

  it("irmãos em espaços diferentes: não há opção 'os dois'; cada um regista a sua aula (I10)", async () => {
    const { phone } = FIXTURES.alunos.joao;
    const { data: adulto } = await sb
      .from("dlbjj_alunos")
      .insert({ nome: "Marta Pereira", data_nascimento: "1985-01-01", phone, publico: "adulto", modalidade: "jiu-jitsu", local_slug: "sao-bras", inicio_em: "2026-10-01", estado: "ativo", consentimento_rgpd_em: new Date().toISOString() })
      .select("id")
      .single();
    await inject({ from: phone, text: "presente", agora: "2026-11-09T19:45:00Z" }); // segunda
    let fila = await filaDe(sb, phone);
    expect(fila.at(-1)!.corpo).toContain("1. João Pereira");
    expect(fila.at(-1)!.corpo).toContain("2. Inês Pereira");
    expect(fila.at(-1)!.corpo).toContain("3. Marta Pereira");
    expect(fila.at(-1)!.corpo).not.toContain("Os dois");
    expect(fila.at(-1)!.corpo).not.toContain("Todos");
    await inject({ from: phone, text: "3", agora: "2026-11-09T19:45:00Z" });
    fila = await filaDe(sb, phone);
    expect(fila.at(-1)!.corpo).toContain("3. 19:30"); // as aulas de São Brás, não as dos miúdos
    await sb.from("dlbjj_alunos").update({ estado: "ex_aluno" }).eq("id", adulto!.id);
  });

  it("um check-in volta a pôr um aluno inativo como ativo", async () => {
    const { phone, id } = FIXTURES.alunos.rui;
    await sb.from("dlbjj_alunos").update({ estado: "inativo" }).eq("id", id);
    await inject({ from: phone, text: "treinei", agora: "2026-11-04T09:00:00Z" }); // quarta
    const { data } = await sb.from("dlbjj_alunos").select("estado").eq("id", id).single();
    expect(data!.estado).toBe("ativo");
  });
});

describe("Jornada C′ — sem aula hoje / sem inscrição", () => {
  it("ao domingo diz que não há aulas e qual é a próxima", async () => {
    const { phone, id } = FIXTURES.alunos.ana;
    const antes = (await presencas(id)).length;
    await inject({ from: phone, text: "presente", agora: DOM });
    const fila = await filaDe(sb, phone);
    expect(fila.at(-1)!.corpo).toBe("Hoje não há aulas em São Brás. A próxima é segunda às 06:00 (Jiu-Jitsu).");
    expect((await presencas(id)).length).toBe(antes);
  });

  it("uma lead sem inscrição é avisada e passa ao Daniel", async () => {
    const phone = "351900000301";
    await inject({ from: phone, text: "presente", agora: SEG_1945 });
    const fila = await filaDe(sb, phone);
    expect(fila.at(-1)!.corpo).toBe("Ainda não tens inscrição concluída. Vou avisar o Daniel para te enviar o formulário. 🙏");
    const { data: lead } = await sb.from("dlbjj_leads").select("paused,human_reason").eq("phone", phone).single();
    expect(lead).toMatchObject({ paused: true, human_reason: "pediu check-in sem inscrição" });
  });
});
