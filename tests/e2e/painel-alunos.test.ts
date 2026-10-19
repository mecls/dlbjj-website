import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { filaDe } from "../helpers/app";
import { getPainel, postPainel } from "../helpers/painel";

const sb = db();
const ana = FIXTURES.alunos.ana;
const joao = FIXTURES.alunos.joao;
const rui = FIXTURES.alunos.rui;

async function turmaId(chave: string): Promise<string> {
  const { data } = await sb.from("dlbjj_turmas").select("id").eq("chave", chave).single();
  return data!.id;
}

beforeAll(() => {
  resetDb();
});

describe("Painel — alunos", () => {
  it("sem sessão, as páginas redirecionam para o login", async () => {
    for (const p of ["/painel/alunos", `/painel/alunos/${ana.id}`, "/painel/aulas"]) {
      const r = await getPainel(p, false);
      expect(r.status, p).toBe(307);
      expect(r.headers.get("location")).toContain("/painel/login");
    }
    const r = await postPainel(`/api/painel/alunos/${ana.id}/graduacao`, { faixa: "preta", graus: "0", atribuida_em: "2026-11-01" }, false);
    expect(r.status).toBe(401);
  });

  it("a lista mostra os alunos com faixa e academia, sem dados do encarregado nem de saúde", async () => {
    const r = await getPainel("/painel/alunos");
    expect(r.status).toBe(200);
    const html = await r.text();
    for (const n of ["Ana Silva", "Rui Costa", "João Pereira", "Inês Pereira"]) expect(html).toContain(n);
    expect(html).toContain("Azul · 1 grau");
    expect(html).toContain("Cinzenta");
    expect(html).not.toContain("Marta Pereira");
    expect(html).not.toContain("asma");
  });

  it("os filtros por academia e estado funcionam", async () => {
    const html = await (await getPainel("/painel/alunos?academia=queluz")).text();
    expect(html).toContain("Rui Costa");
    expect(html).not.toContain("Ana Silva");
    const html2 = await (await getPainel("/painel/alunos?estado=inativo")).text();
    expect(html2).not.toContain("Rui Costa");
    expect(html2).toContain("Ainda não há alunos");
  });

  it("a ficha mostra faixa, encarregado e saúde", async () => {
    const html = await (await getPainel(`/painel/alunos/${joao.id}`)).text();
    expect(html).toContain("João Pereira");
    expect(html).toContain("Cinzenta");
    expect(html).toContain("Marta Pereira");
    expect(html).toContain("asma leve");
    expect(html).toContain("BJJ Kids");
  });

  it("registar graduação acrescenta uma linha (e nunca apaga as anteriores)", async () => {
    const r = await postPainel(`/api/painel/alunos/${ana.id}/graduacao`, { faixa: "roxa", graus: "0", atribuida_em: "2026-11-01", nota: "exame" });
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toContain(`/painel/alunos/${ana.id}`);
    const { data } = await sb.from("dlbjj_graduacoes").select("faixa").eq("aluno_id", ana.id);
    expect(data).toHaveLength(4);
    const html = await (await getPainel(`/painel/alunos/${ana.id}`)).text();
    expect(html).toContain("Roxa");
  });

  it("marcar presença à mão é única por aluno, turma e dia", async () => {
    const t = await turmaId("sao-bras|Jiu-Jitsu|Segunda e Quarta|19:30");
    const r1 = await postPainel(`/api/painel/alunos/${ana.id}/presenca`, { turma_id: t, data: "2026-10-05" });
    expect(r1.status).toBe(303);
    const r2 = await postPainel(`/api/painel/alunos/${ana.id}/presenca`, { turma_id: t, data: "2026-10-05" });
    expect(r2.status).toBe(303);
    expect(r2.headers.get("location")).toContain("erro=duplicada");
    const { count } = await sb.from("dlbjj_presencas").select("*", { count: "exact", head: true }).eq("aluno_id", ana.id).eq("data", "2026-10-05");
    expect(count).toBe(1);
  });

  it("mudar o estado para inativo e enviar o link do perfil", async () => {
    await postPainel(`/api/painel/alunos/${ana.id}/estado`, { estado: "inativo" });
    const { data } = await sb.from("dlbjj_alunos").select("estado").eq("id", ana.id).single();
    expect(data!.estado).toBe("inativo");
    const r = await postPainel(`/api/painel/alunos/${ana.id}/perfil-link`, {});
    expect(r.status).toBe(303);
    const fila = await filaDe(sb, ana.phone);
    expect(fila.at(-1)).toMatchObject({ kind: "sistema" });
    expect(fila.at(-1)!.corpo).toContain("/aluno/");
  });

  it("criar um aluno à mão", async () => {
    const r = await postPainel("/api/painel/alunos", {
      nome: "Pedro Manual",
      data_nascimento: "1995-02-02",
      phone: "351940000001",
      local_slug: "sao-bras",
      modalidade: "mma",
      faixa: "branca",
      graus: "0",
      consentimento_rgpd: "on",
      inicio_em: "2026-01-15",
    });
    expect(r.status).toBe(303);
    const { data } = await sb.from("dlbjj_alunos").select("nome,modalidade,inicio_em,estado").eq("phone", "351940000001").single();
    expect(data).toEqual({ nome: "Pedro Manual", modalidade: "mma", inicio_em: "2026-01-15", estado: "ativo" });
    expect(await filaDe(sb, "351940000001")).toHaveLength(0);
  });

  it("anonimizar exige a palavra ANONIMIZAR e mantém faixas, presenças e opt-outs (AC-12, metade manual)", async () => {
    const { count: grads } = await sb.from("dlbjj_graduacoes").select("*", { count: "exact", head: true }).eq("aluno_id", rui.id);
    const { count: pres } = await sb.from("dlbjj_presencas").select("*", { count: "exact", head: true }).eq("aluno_id", rui.id);
    const r0 = await postPainel(`/api/painel/alunos/${rui.id}/anonimizar`, { confirmacao: "sim" });
    expect(r0.status).toBe(303);
    expect(r0.headers.get("location")).toContain("erro=confirmacao");
    const r = await postPainel(`/api/painel/alunos/${rui.id}/anonimizar`, { confirmacao: "ANONIMIZAR" });
    expect(r.status).toBe(303);
    const { data } = await sb.from("dlbjj_alunos").select("nome,phone,estado,email,nif,data_nascimento").eq("id", rui.id).single();
    expect(data!.nome).toBe("Aluno anonimizado");
    expect(data!.phone.startsWith("anon:")).toBe(true);
    expect(data).toMatchObject({ estado: "anonimizado", email: null, nif: null, data_nascimento: null });
    const { count: grads2 } = await sb.from("dlbjj_graduacoes").select("*", { count: "exact", head: true }).eq("aluno_id", rui.id);
    const { count: pres2 } = await sb.from("dlbjj_presencas").select("*", { count: "exact", head: true }).eq("aluno_id", rui.id);
    expect(grads2).toBe(grads);
    expect(pres2).toBe(pres);
    const html = await (await getPainel("/painel/alunos")).text();
    expect(html).not.toContain("Rui Costa");
  });
});

describe("Painel — aulas", () => {
  it("a lista de aulas é um ranking e assinala a aula com mais alunos", async () => {
    const html = await (await getPainel("/painel/aulas")).text();
    expect(html).toContain("a aula com mais alunos");
    const linha = html.split("<tr").find((tr) => tr.includes("a aula com mais alunos"))!;
    expect(linha).toContain("BJJ Kids");
    expect(linha).toContain("18:30");
  });

  it("marcar presenças de uma aula para um dia, ignorando as repetidas", async () => {
    const t = await turmaId("kids-amadora|Kids|Segunda, Quarta e Sexta|18:30");
    const html = await (await getPainel(`/painel/aulas/${t}?data=2026-10-07`)).text();
    expect(html).toContain("João Pereira");
    expect(html).toContain("Inês Pereira");
    const r = await postPainel(`/api/painel/aulas/${t}/presencas`, { data: "2026-09-28", aluno_ids: [joao.id, FIXTURES.alunos.ines.id] });
    expect(r.status).toBe(303);
    const r2 = await postPainel(`/api/painel/aulas/${t}/presencas`, { data: "2026-09-28", aluno_ids: [joao.id] });
    expect(r2.status).toBe(303);
    const { count } = await sb.from("dlbjj_presencas").select("*", { count: "exact", head: true }).eq("turma_id", t).eq("data", "2026-09-28");
    expect(count).toBe(2);
    const { data: p } = await sb.from("dlbjj_presencas").select("origem").eq("turma_id", t).eq("data", "2026-09-28");
    expect(p!.every((x) => x.origem === "painel")).toBe(true);
  });
});
