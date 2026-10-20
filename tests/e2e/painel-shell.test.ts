import { beforeAll, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { getPainel } from "../helpers/painel";

beforeAll(() => {
  resetDb();
});

describe("Painel — shell partilhado (design §4, §6)", () => {
  it("as páginas autenticadas têm a barra lateral com a navegação do Daniel", async () => {
    const html = await (await getPainel("/painel/alunos")).text();
    expect(html).toContain('id="sidebar"');
    expect(html).toContain('src="/brand/logo.png"');
    for (const item of ["Início", "Mensagens", "Alunos", "Aulas", "Eventos", "Reativação", "Agente", "Sair"]) expect(html, item).toContain(item);
    expect(html).toContain("data-drawer");
    expect(html).toContain(">DL<");
  });
  it("Perguntar está desligado", async () => {
    expect((await getPainel("/painel/perguntar")).status).toBe(404);
    expect(await (await getPainel("/painel")).text()).not.toContain('href="/painel/perguntar"');
  });
  it("o login não tem barra lateral", async () => {
    const html = await (await getPainel("/painel/login", false)).text();
    expect(html).not.toContain('id="sidebar"');
    expect(html).toContain('src="/brand/logo.png"');
  });
});
