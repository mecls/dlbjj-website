import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { E2E_URL, filaDe } from "../helpers/app";
import { cookieDe, getAluno, pedirCodigo, postAluno, sessaoDe } from "../helpers/aluno";

const sb = db();
beforeAll(() => {
  resetDb();
});
beforeEach(async () => {
  await sb.from("dlbjj_limites").delete().like("chave", "codigo-ip:%");
});
const codigoDe = (corpo: string) => corpo.match(/\*(\d{6})\*/)![1];

describe("Entrar na área de aluno (design §5.1)", () => {
  it("pede o código, recebe-o na fila como 'sistema' e entra", async () => {
    const { ana } = FIXTURES.alunos;
    const { r, entrar } = await pedirCodigo("920000001"); // normaliza o telemóvel
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toContain("/aluno/entrar?passo=codigo");
    const fila = await filaDe(sb, ana.phone);
    expect(fila.at(-1)!.kind).toBe("sistema");
    expect(fila.at(-1)!.corpo).toContain("Vale 10 minutos");
    const r2 = await postAluno("/api/aluno/entrar", { codigo: codigoDe(fila.at(-1)!.corpo) }, entrar);
    expect(r2.status).toBe(303);
    expect(r2.headers.get("location")).toMatch(/\/aluno$/);
    const sessao = cookieDe(r2, "dlbjj_aluno");
    const html = await (await getAluno("/aluno", sessao)).text();
    expect(html).toContain("Ana 👋");
    expect(html).toContain('id="sidebar"');
    expect(html).not.toContain(ana.phone);
    const saiu = await postAluno("/api/aluno/sair", {}, sessao);
    expect(saiu.status).toBe(303);
    expect((await getAluno("/aluno", sessao)).status).toBe(307);
  });
  it("sem sessão, /aluno manda para /aluno/entrar", async () => {
    const r = await getAluno("/aluno");
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toContain("/aluno/entrar");
  });
  it("número desconhecido: mesma resposta, nada na fila", async () => {
    const { r } = await pedirCodigo("351999999999");
    expect(r.headers.get("location")).toContain("passo=codigo");
    expect(await filaDe(sb, "351999999999")).toHaveLength(0);
  });
  it("cinco códigos errados bloqueiam; o certo já não entra", async () => {
    const { rui } = FIXTURES.alunos;
    const { entrar } = await pedirCodigo(rui.phone);
    for (let i = 0; i < 4; i++) expect((await postAluno("/api/aluno/entrar", { codigo: "000000" }, entrar)).headers.get("location")).toContain("erro=codigo");
    expect((await postAluno("/api/aluno/entrar", { codigo: "000000" }, entrar)).headers.get("location")).toContain("erro=bloqueado");
    const certo = codigoDe((await filaDe(sb, rui.phone)).at(-1)!.corpo);
    expect((await postAluno("/api/aluno/entrar", { codigo: certo }, entrar)).headers.get("location")).toContain("erro=bloqueado");
  });
  it("três códigos por telemóvel por hora", async () => {
    for (let i = 0; i < 3; i++) expect((await pedirCodigo("351999999998")).r.headers.get("location")).toContain("passo=codigo");
    expect((await pedirCodigo("351999999998")).r.headers.get("location")).toContain("erro=limite");
  });
  it("com a sessão do WhatsApp em baixo não sai código", async () => {
    await sb.from("dlbjj_sessao").upsert({ id: 1, estado: "caido", visto_em: new Date().toISOString() }, { onConflict: "id" });
    const { r } = await pedirCodigo(FIXTURES.alunos.joao.phone);
    expect(r.headers.get("location")).toContain("erro=sessao");
    expect(await filaDe(sb, FIXTURES.alunos.joao.phone)).toHaveLength(0);
    await sb.from("dlbjj_sessao").delete().eq("id", 1);
  });
  it("com o bot desligado não sai código", async () => {
    await sb.from("dlbjj_settings").upsert({ key: "bot_enabled", value: "off" }, { onConflict: "key" });
    const { r } = await pedirCodigo(FIXTURES.alunos.joao.phone);
    expect(r.headers.get("location")).toContain("erro=bot");
    expect(await filaDe(sb, FIXTURES.alunos.joao.phone)).toHaveLength(0);
    await sb.from("dlbjj_settings").upsert({ key: "bot_enabled", value: "on" }, { onConflict: "key" });
  });
  it("irmãos: troca de aluno só dentro do mesmo telemóvel", async () => {
    const { joao, ines, ana } = FIXTURES.alunos;
    const sessao = await sessaoDe(joao.id, joao.phone);
    expect(await (await getAluno("/aluno", sessao)).text()).toContain("João 👋");
    await postAluno("/api/aluno/escolher", { aluno_id: ana.id }, sessao);
    expect(await (await getAluno("/aluno", sessao)).text()).toContain("João 👋");
    await postAluno("/api/aluno/escolher", { aluno_id: ines.id }, sessao);
    expect(await (await getAluno("/aluno", sessao)).text()).toContain("Inês 👋");
  });
  it("ex-aluno perde a sessão", async () => {
    const { rui } = FIXTURES.alunos;
    const sessao = await sessaoDe(rui.id, rui.phone);
    expect((await getAluno("/aluno", sessao)).status).toBe(200);
    await sb.from("dlbjj_alunos").update({ estado: "ex_aluno" }).eq("id", rui.id);
    expect((await getAluno("/aluno", sessao)).status).toBe(307);
    await sb.from("dlbjj_alunos").update({ estado: "ativo" }).eq("id", rui.id);
  });
  it("o teto global só conta códigos enviados e, esgotado, cala-se sem revelar quem é aluno", async () => {
    const { ana } = FIXTURES.alunos;
    await sb.from("dlbjj_limites").upsert({ chave: "codigo-global:academia:86400", contagem: 30, expira_em: new Date(Date.now() + 3_600_000).toISOString() }, { onConflict: "chave" });
    const antes = (await filaDe(sb, ana.phone)).length;
    const { r } = await pedirCodigo(ana.phone);
    expect(r.headers.get("location")).toContain("passo=codigo"); // nunca "erro=limite": um estranho não pode fechar a porta a todos
    expect((await filaDe(sb, ana.phone)).length).toBe(antes); // mas não saiu código
    await sb.from("dlbjj_limites").delete().eq("chave", "codigo-global:academia:86400");
  });
  it("vinte códigos errados do mesmo IP em 15 minutos travam o passo 2", async () => {
    const { rui } = FIXTURES.alunos;
    await sb.from("dlbjj_limites").delete().like("chave", "entrar-ip:%");
    const { entrar } = await pedirCodigo(rui.phone);
    const locs: string[] = [];
    for (let i = 0; i < 21; i++) locs.push((await postAluno("/api/aluno/entrar", { codigo: "999999" }, entrar)).headers.get("location") ?? "");
    expect(locs[0]).toContain("erro=codigo");
    expect(locs[19]).toContain("erro=bloqueado");
    expect(locs[20]).toContain("erro=limite");
  });
  it("a página de entrar renderiza sem sessão", async () => {
    const html = await (await fetch(`${E2E_URL}/aluno/entrar`)).text();
    expect(html).toContain("Enviar código");
    expect(html).not.toContain('id="sidebar"');
  });
});
