import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { getPainel, postPainel } from "../helpers/painel";
import { getAluno, sessaoDe } from "../helpers/aluno";
import { hojeLisboa, somarDias } from "@/lib/tempo";

const sb = db();
beforeAll(() => {
  resetDb();
});

describe("Painel — eventos (ajustes §2.5)", () => {
  it("o calendário vem primeiro, o modal cria no mês certo, edita e cancela", async () => {
    const hoje = hojeLisboa();
    const mes = hoje.slice(0, 7);
    const dia = somarDias(hoje, 2);
    let html = await (await getPainel(`/painel/eventos?mes=${mes}`)).text();
    expect(html).toContain("Seminário de guarda com convidado");
    expect(html).toContain(`href="/painel/eventos?mes=${mes}&amp;novo=${hoje}"`);
    expect(html).not.toContain('role="dialog"');
    html = await (await getPainel(`/painel/eventos?mes=${mes}&novo=${dia}`)).text();
    expect(html).toContain('role="dialog"');
    expect(html).toContain(`value="${dia}"`);
    const r = await postPainel("/api/painel/eventos", { mes, titulo: "Treino aberto", dia, hora: "19:00", local_slug: "sao-bras", descricao: "Traz rashguard" });
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe(`/painel/eventos?mes=${mes}&ok=1`);
    const { data } = await sb.from("dlbjj_eventos").select("id").eq("titulo", "Treino aberto").single();
    html = await (await getPainel(`/painel/eventos?mes=${mes}&editar=${data!.id}`)).text();
    expect(html).toContain('value="Treino aberto"');
    expect(html).toContain("Cancelar evento");
    await postPainel(`/api/painel/eventos/${data!.id}`, { mes, titulo: "Treino aberto a todos", dia, hora: "19:00", local_slug: "", descricao: "" });
    const ana = await sessaoDe(FIXTURES.alunos.ana.id, FIXTURES.alunos.ana.phone);
    expect(await (await getAluno("/aluno/calendario", ana)).text()).toContain("Treino aberto a todos");
    const c = await postPainel(`/api/painel/eventos/${data!.id}/cancelar`, { mes });
    expect(c.headers.get("location")).toBe(`/painel/eventos?mes=${mes}&ok=1`);
    html = await (await getPainel(`/painel/eventos?mes=${mes}&editar=${data!.id}`)).text();
    expect(html).toContain("Este evento foi cancelado.");
    expect(html).not.toContain("Cancelar evento");
    expect(await (await getAluno("/aluno/calendario", ana)).text()).not.toContain("Treino aberto");
  }, 90_000);
  it("título vazio reabre o modal com o erro", async () => {
    const r = await postPainel("/api/painel/eventos", { mes: "2026-12", titulo: "", dia: "2026-12-01" });
    expect(r.headers.get("location")).toContain("erro=");
    expect(r.headers.get("location")).toContain("novo=2026-12-01");
    expect(await (await getPainel(r.headers.get("location")!)).text()).toContain("Título obrigatório");
  });
  it("sem sessão → 401", async () => {
    expect((await postPainel("/api/painel/eventos", { titulo: "x", dia: "2026-12-01" }, false)).status).toBe(401);
  });
});
