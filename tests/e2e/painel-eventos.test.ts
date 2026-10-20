import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { getPainel, postPainel } from "../helpers/painel";
import { getAluno, sessaoDe } from "../helpers/aluno";
import { hojeLisboa, somarDias } from "@/lib/tempo";

const sb = db();
beforeAll(() => {
  resetDb();
});

describe("Painel — eventos (design §6)", () => {
  it("cria, mostra ao aluno, edita e cancela", async () => {
    const dia = somarDias(hojeLisboa(), 2);
    const r = await postPainel("/api/painel/eventos", { titulo: "Treino aberto", dia, hora: "19:00", local_slug: "sao-bras", descricao: "Traz rashguard" });
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("/painel/eventos?ok=1");
    let html = await (await getPainel("/painel/eventos")).text();
    expect(html).toContain("Treino aberto");
    expect(html).toContain("Seminário de guarda com convidado");
    const ana = await sessaoDe(FIXTURES.alunos.ana.id, FIXTURES.alunos.ana.phone);
    const calendario = await (await getAluno("/aluno/calendario", ana)).text();
    expect(calendario).toContain("Treino aberto");
    expect(calendario).toContain("Traz rashguard"); // a descrição que o Daniel escreve é para os alunos lerem
    const { data } = await sb.from("dlbjj_eventos").select("id").eq("titulo", "Treino aberto").single();
    await postPainel(`/api/painel/eventos/${data!.id}`, { titulo: "Treino aberto a todos", dia, hora: "19:00", local_slug: "", descricao: "" });
    expect(await (await getPainel(`/painel/eventos?editar=${data!.id}`)).text()).toContain('value="Treino aberto a todos"');
    await postPainel(`/api/painel/eventos/${data!.id}/cancelar`, {});
    html = await (await getPainel("/painel/eventos")).text();
    expect(html).toContain("cancelado");
    expect(await (await getAluno("/aluno/calendario", ana)).text()).not.toContain("Treino aberto");
  }, 90_000); // compila a frio três rotas (eventos, calendário, edição); com a suite inteira a correr passa dos 30 s
  it("título vazio volta com erro", async () => {
    const r = await postPainel("/api/painel/eventos", { titulo: "", dia: "2026-12-01" });
    expect(r.headers.get("location")).toContain("erro=");
  });
  it("sem sessão → 401", async () => {
    expect((await postPainel("/api/painel/eventos", { titulo: "x", dia: "2026-12-01" }, false)).status).toBe(401);
  });
});
