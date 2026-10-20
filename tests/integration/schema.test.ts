import { beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { db, FIXTURES, resetDb } from "../helpers/db";

const sb = db();
// O relógio do container pode estar uns ms à frente do do host; uma linha "pronta"
// é inserida com enviar_apos no passado para o teste não depender disso.
const PASSADO = new Date(Date.now() - 60_000).toISOString();

beforeAll(() => {
  resetDb();
});

describe("003_dlbjj_alunos", () => {
  it("recusa uma segunda presença do mesmo aluno na mesma turma no mesmo dia", async () => {
    const { data: turma } = await sb
      .from("dlbjj_turmas")
      .select("id")
      .eq("chave", "sao-bras|Jiu-Jitsu|Segunda e Quarta|19:30")
      .single();
    const linha = { aluno_id: FIXTURES.alunos.ana.id, turma_id: turma!.id, data: "2026-09-07", origem: "whatsapp" };
    const primeira = await sb.from("dlbjj_presencas").insert(linha);
    expect(primeira.error).toBeNull();
    const segunda = await sb.from("dlbjj_presencas").insert(linha);
    expect(segunda.error?.code).toBe("23505");
  });

  it("recusa alterar uma graduação (tabela só de acrescentar)", async () => {
    const { data: g } = await sb
      .from("dlbjj_graduacoes")
      .select("id")
      .eq("aluno_id", FIXTURES.alunos.ana.id)
      .limit(1)
      .single();
    const { error } = await sb.from("dlbjj_graduacoes").update({ graus: 4 }).eq("id", g!.id);
    expect(error?.message).toMatch(/só de acrescentar/);
  });

  it("entrega uma linha pendente a exatamente um de dois workers", async () => {
    await sb.from("dlbjj_fila_saida").insert({ phone: "351999000001", kind: "resposta", corpo: "olá", enviar_apos: PASSADO });
    const agora = new Date().toISOString();
    const [a, b] = await Promise.all([
      sb.rpc("dlbjj_reclamar_fila", { p_worker: "w1", p_agora: agora, p_ttl: "10 minutes" }),
      sb.rpc("dlbjj_reclamar_fila", { p_worker: "w2", p_agora: agora, p_ttl: "10 minutes" }),
    ]);
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
    const total = (a.data?.length ?? 0) + (b.data?.length ?? 0);
    expect(total).toBe(1);
    const ganhou = a.data?.length ? a.data[0] : b.data![0];
    expect(ganhou.estado).toBe("a_enviar");
  });

  it("nunca entrega uma proativa a um número com opt-out", async () => {
    const hash = createHash("sha256").update(FIXTURES.optOutPhone).digest("hex");
    const { data: opt } = await sb.from("dlbjj_opt_outs").select("phone_hash").eq("phone_hash", hash).single();
    expect(opt).not.toBeNull();
    await sb.from("dlbjj_fila_saida").insert({ phone: FIXTURES.optOutPhone, kind: "proativa", regra: "R4", corpo: "volta", enviar_apos: PASSADO });
    const { data } = await sb.rpc("dlbjj_reclamar_fila", { p_worker: "w1", p_agora: new Date().toISOString(), p_ttl: "10 minutes" });
    expect(data?.some((r: { phone: string }) => r.phone === FIXTURES.optOutPhone)).toBe(false);
  });

  it("entrega uma resposta ao mesmo número com opt-out (o opt-out só trava proativas)", async () => {
    await sb.from("dlbjj_fila_saida").insert({ phone: FIXTURES.optOutPhone, kind: "resposta", corpo: "entendido", enviar_apos: PASSADO });
    const { data } = await sb.rpc("dlbjj_reclamar_fila", { p_worker: "w1", p_agora: new Date().toISOString(), p_ttl: "10 minutes" });
    expect(data?.some((r: { phone: string; kind: string }) => r.phone === FIXTURES.optOutPhone && r.kind === "resposta")).toBe(true);
  });

  it("terminar_fila sobe tentativas e espelha o estado na mensagem", async () => {
    const { data: msg } = await sb
      .from("dlbjj_mensagens")
      .insert({ phone: "351999000002", direction: "out", role: "bot", body: "x", estado: "na_fila" })
      .select("id")
      .single();
    const { data: fila } = await sb
      .from("dlbjj_fila_saida")
      .insert({ phone: "351999000002", kind: "resposta", corpo: "x", mensagem_id: msg!.id })
      .select("id")
      .single();
    const { error } = await sb.rpc("dlbjj_terminar_fila", { p_id: fila!.id, p_estado: "enviada", p_wa_message_id: "wamid.1" });
    expect(error).toBeNull();
    const { data: f } = await sb.from("dlbjj_fila_saida").select("estado,tentativas,wa_message_id,locked_by").eq("id", fila!.id).single();
    expect(f).toMatchObject({ estado: "enviada", tentativas: 1, wa_message_id: "wamid.1", locked_by: null });
    const { data: m } = await sb.from("dlbjj_mensagens").select("estado,wa_message_id").eq("id", msg!.id).single();
    expect(m).toMatchObject({ estado: "enviada", wa_message_id: "wamid.1" });
  });

  it("tem as 14 turmas de content/site.ts", async () => {
    const { count } = await sb.from("dlbjj_turmas").select("*", { count: "exact", head: true }).eq("ativa", true);
    expect(count).toBe(14);
  });
});

describe("004_dlbjj_correcoes", () => {
  it("apagar uma linha da fila com um toque associado deixa o toque com fila_id a null", async () => {
    const { data: f } = await sb.from("dlbjj_fila_saida").insert({ phone: "351999000003", kind: "proativa", regra: "R4", corpo: "x", estado: "enviada" }).select("id").single();
    const { data: t } = await sb.from("dlbjj_toques").insert({ phone: "351999000003", regra: "R4", fila_id: f!.id, estado: "enviada" }).select("id").single();
    const { error } = await sb.from("dlbjj_fila_saida").delete().eq("id", f!.id);
    expect(error).toBeNull();
    const { data: depois } = await sb.from("dlbjj_toques").select("fila_id,estado").eq("id", t!.id).single();
    expect(depois).toEqual({ fila_id: null, estado: "enviada" });
  });

  it("um toque pode ficar cancelado", async () => {
    const { error } = await sb.from("dlbjj_toques").insert({ phone: "351999000004", regra: "R1", estado: "cancelada" });
    expect(error).toBeNull();
  });

  it("terminar_fila(pendente) limpa envio_iniciado_em para a linha voltar a ser reclamável", async () => {
    const { data: f } = await sb
      .from("dlbjj_fila_saida")
      .insert({ phone: "351999000005", kind: "resposta", corpo: "x", estado: "a_enviar", locked_by: "w", locked_at: PASSADO, envio_iniciado_em: PASSADO, enviar_apos: PASSADO })
      .select("id")
      .single();
    await sb.rpc("dlbjj_terminar_fila", { p_id: f!.id, p_estado: "pendente", p_erro: "503", p_enviar_apos: PASSADO });
    const { data } = await sb.from("dlbjj_fila_saida").select("estado,envio_iniciado_em").eq("id", f!.id).single();
    expect(data).toEqual({ estado: "pendente", envio_iniciado_em: null });
    const { data: r } = await sb.rpc("dlbjj_reclamar_fila", { p_worker: "w2", p_agora: new Date().toISOString(), p_ttl: "10 minutes" });
    expect(r?.some((x: { id: string }) => x.id === f!.id)).toBe(true);
  });
});

describe("005_dlbjj_area_aluno", () => {
  it("tem as tabelas de códigos, sessões e eventos, e as fixtures", async () => {
    const codigo = await sb.from("dlbjj_codigos_login").insert({ phone: "351920000001", codigo_hash: "x".repeat(64), expira_em: new Date(Date.now() + 600_000).toISOString() }).select("id,tentativas").single();
    expect(codigo.error).toBeNull();
    expect(codigo.data!.tentativas).toBe(0);
    const sessao = await sb.from("dlbjj_sessoes_aluno").insert({ token_hash: "s".repeat(64), phone: "351920000001", aluno_id: FIXTURES.alunos.ana.id, expira_em: new Date(Date.now() + 600_000).toISOString() });
    expect(sessao.error).toBeNull();
    const { data: eventos } = await sb.from("dlbjj_eventos").select("id,titulo,local_slug,hora").order("dia");
    expect(eventos).toHaveLength(2);
    expect(eventos![0]).toMatchObject({ id: FIXTURES.eventos.seminario.id, local_slug: "queluz", hora: "10:00:00" });
    expect(eventos![1]).toMatchObject({ id: FIXTURES.eventos.graduacao.id, local_slug: null });
    const { count } = await sb.from("dlbjj_presencas").select("*", { count: "exact", head: true }).eq("aluno_id", FIXTURES.alunos.rui.id);
    expect(count).toBe(14); // 5 recentes + 9 antigas (a Ana recebe uma presença extra no teste da 003)
    const { data: ana } = await sb.from("dlbjj_alunos").select("ranking_visivel").eq("id", FIXTURES.alunos.ana.id).single();
    expect(ana!.ranking_visivel).toBe(true);
  });
});

describe("006_dlbjj_painel_ajustes", () => {
  it("tem a tabela dos resumos, uma linha por lead", async () => {
    const r = await sb.from("dlbjj_resumos").insert({ lead_id: FIXTURES.leads.novo.id, situacao: "x", quer: "y", mensagens: 1, ate: new Date().toISOString() });
    expect(r.error).toBeNull();
    const dup = await sb.from("dlbjj_resumos").insert({ lead_id: FIXTURES.leads.novo.id, situacao: "x", quer: "y", mensagens: 1, ate: new Date().toISOString() });
    expect(dup.error?.code).toBe("23505");
  });
});
