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
    for (const item of ["Início", "Mensagens", "Alunos", "Aulas", "Eventos", "Reativação", "Perguntar", "Agente", "Sair"]) expect(html, item).toContain(item);
    expect(html).toContain("data-drawer");
    expect(html).toContain(">DL<");
  });
  it("o login não tem barra lateral", async () => {
    const html = await (await getPainel("/painel/login", false)).text();
    expect(html).not.toContain('id="sidebar"');
    expect(html).toContain('src="/brand/logo.png"');
  });
});
