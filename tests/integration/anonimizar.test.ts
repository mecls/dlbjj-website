import { beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { anonimizarAntigos } from "@/lib/anonimizar";
import { db, FIXTURES, resetDb } from "../helpers/db";

const sb = db();
const PHONE = "351950000001";
let alunoId: string;

beforeAll(async () => {
  resetDb();
  // Um aluno inativo cuja última presença e última mensagem têm 25 meses.
  const { data: a } = await sb
    .from("dlbjj_alunos")
    .insert({ nome: "Antigo Silva", data_nascimento: "1990-01-01", phone: PHONE, email: "antigo@example.com", nif: "123456789", enc_nome: "X", condicoes_saude: "joelho", publico: "adulto", modalidade: "jiu-jitsu", local_slug: "queluz", inicio_em: "2023-01-01", estado: "inativo" })
    .select("id")
    .single();
  alunoId = a!.id;
  const { data: t } = await sb.from("dlbjj_turmas").select("id").eq("chave", "queluz|Jiu-Jitsu (Adultos)|Terça, Quarta e Sexta|08:00").single();
  await sb.from("dlbjj_graduacoes").insert([{ aluno_id: alunoId, faixa: "branca", graus: 0, atribuida_em: "2023-01-01" }, { aluno_id: alunoId, faixa: "azul", graus: 0, atribuida_em: "2024-01-01" }]);
  await sb.from("dlbjj_presencas").insert([{ aluno_id: alunoId, turma_id: t!.id, data: "2024-09-01", origem: "whatsapp" }, { aluno_id: alunoId, turma_id: t!.id, data: "2024-09-03", origem: "painel" }]);
  await sb.from("dlbjj_leads").insert({ phone: PHONE, name: "Antigo Silva", step: "concluido", status: "inscrito", aluno_id: alunoId, last_message_at: "2024-09-03T10:00:00Z" });
  await sb.from("dlbjj_mensagens").insert([{ phone: PHONE, direction: "in", role: "lead", body: "olá, sou o antigo", created_at: "2024-09-03T10:00:00Z" }, { phone: PHONE, direction: "out", role: "bot", body: "olá antigo", created_at: "2024-09-03T10:00:05Z" }]);
  await sb.from("dlbjj_opt_outs").insert({ phone_hash: createHash("sha256").update(PHONE).digest("hex"), motivo: "parar" });
});

describe("anonimização mensal (AC-12)", () => {
  it("anonimiza quem está há 24 meses sem contacto e mantém faixas, presenças e opt-out", async () => {
    const r = await anonimizarAntigos();
    expect(r.alunos).toBe(1);
    const { data: a } = await sb.from("dlbjj_alunos").select("*").eq("id", alunoId).single();
    expect(a!.nome).toBe("Aluno anonimizado");
    expect(a!.phone.startsWith("anon:")).toBe(true);
    expect(a).toMatchObject({ estado: "anonimizado", email: null, nif: null, enc_nome: null, condicoes_saude: null, data_nascimento: null });
    const { data: msgs } = await sb.from("dlbjj_mensagens").select("body,phone").eq("phone", a!.phone);
    expect(msgs).toHaveLength(2);
    expect(msgs!.every((m) => m.body === "[anonimizado]")).toBe(true);
    const { count: g } = await sb.from("dlbjj_graduacoes").select("*", { count: "exact", head: true }).eq("aluno_id", alunoId);
    const { count: p } = await sb.from("dlbjj_presencas").select("*", { count: "exact", head: true }).eq("aluno_id", alunoId);
    expect(g).toBe(2);
    expect(p).toBe(2);
    const { data: opt } = await sb.from("dlbjj_opt_outs").select("phone_hash").eq("phone_hash", createHash("sha256").update(PHONE).digest("hex")).single();
    expect(opt).not.toBeNull();
    const { data: lead } = await sb.from("dlbjj_leads").select("name,phone").eq("aluno_id", alunoId).single();
    expect(lead).toEqual({ name: "Lead anonimizada", phone: a!.phone });
  });

  it("não toca em alunos ativos nem em quem treinou há pouco", async () => {
    const { data: ana } = await sb.from("dlbjj_alunos").select("nome").eq("id", FIXTURES.alunos.ana.id).single();
    expect(ana!.nome).toBe("Ana Silva");
    const r = await anonimizarAntigos();
    expect(r.alunos).toBe(0);
  });

  it("uma lead antiga sem aluno também é anonimizada", async () => {
    await sb.from("dlbjj_leads").insert({ phone: "351950000002", name: "Lead Velha", step: "nome", status: "perdido", last_message_at: "2024-01-01T00:00:00Z" });
    const r = await anonimizarAntigos();
    expect(r.leads).toBe(1);
    const { data } = await sb.from("dlbjj_leads").select("name,phone").like("phone", "anon:%").eq("name", "Lead anonimizada");
    expect(data!.length).toBeGreaterThanOrEqual(2);
  });
});
