import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { E2E_URL, filaDe, inject } from "../helpers/app";
import { cookieDe, getAluno, postAluno } from "../helpers/aluno";
import { hashToken } from "@/lib/tokens";

const sb = db();

function tokenDe(corpo: string): string {
  const m = corpo.match(/\/aluno\/([A-Za-z0-9_-]+)/);
  if (!m) throw new Error(`sem link no corpo: ${corpo}`);
  return m[1];
}

beforeAll(() => {
  resetDb();
});

describe("Jornada F — link do perfil", () => {
  it("'perfil' envia um link válido 7 dias; o link confirma, o botão entra e é de uso único", async () => {
    const { phone } = FIXTURES.alunos.rui;
    await inject({ from: phone, text: "perfil" });
    const fila = await filaDe(sb, phone);
    const corpo = fila.at(-1)!.corpo;
    expect(corpo).toContain("Aqui tens o link para entrares na tua área de aluno, Rui:");
    expect(corpo).toContain(`${E2E_URL}/aluno/`);
    expect(corpo).toContain("(vale 7 dias)");
    const token = tokenDe(corpo);

    const r = await fetch(`${E2E_URL}/aluno/${token}`);
    expect(r.status).toBe(200);
    const pagina = await r.text();
    expect(pagina).toContain("Entrar como Rui");
    expect(pagina).toContain('name="token"');
    expect((await fetch(`${E2E_URL}/aluno/${token}`)).status).toBe(200); // o GET não consome

    const entrou = await postAluno("/api/aluno/link", { token });
    expect(entrou.status).toBe(303);
    expect(entrou.headers.get("location")).toMatch(/\/aluno$/);
    const sessao = cookieDe(entrou, "dlbjj_aluno");
    const html = await (await getAluno("/aluno", sessao)).text();
    expect(html).toContain("Rui 👋");

    const segunda = await postAluno("/api/aluno/link", { token });
    expect(segunda.headers.get("location")).toContain("erro=link");
    expect((await fetch(`${E2E_URL}/aluno/${token}`)).status).toBe(410);
  });

  it("com dois irmãos pergunta de quem é, e a ficha de um menor não mostra saúde nem encarregado", async () => {
    const { phone } = FIXTURES.alunos.joao;
    await inject({ from: phone, text: "a minha ficha" });
    let fila = await filaDe(sb, phone);
    expect(fila.at(-1)!.corpo).toContain("De quem é a ficha?");
    await inject({ from: phone, text: "1" });
    fila = await filaDe(sb, phone);
    const token = tokenDe(fila.at(-1)!.corpo);
    expect(await (await fetch(`${E2E_URL}/aluno/${token}`)).text()).toContain("Entrar como João");
    const entrou = await postAluno("/api/aluno/link", { token });
    const html = await (await getAluno("/aluno", cookieDe(entrou, "dlbjj_aluno"))).text();
    expect(html).toContain("João 👋");
    expect(html).not.toContain("asma");
    expect(html).not.toContain("Marta");
  });

  it("ao quarto pedido no mesmo dia manda usar o anterior", async () => {
    const { phone } = FIXTURES.alunos.ana;
    for (let i = 0; i < 3; i++) await inject({ from: phone, text: "perfil" });
    await inject({ from: phone, text: "perfil" });
    const fila = await filaDe(sb, phone);
    expect(fila.at(-1)!.corpo).toContain("Já te enviei 3 links hoje");
    expect(fila.at(-1)!.corpo).toContain("/aluno/entrar");
    expect(fila.filter((r) => /\/aluno\/[A-Za-z0-9_-]{20,}/.test(r.corpo))).toHaveLength(3);
  });
});

describe("Jornada F′ — link expirado ou desconhecido", () => {
  it("expirado → 410 sem nome", async () => {
    const token = "expirado-expirado-expirado-expirado-expirado";
    await sb.from("dlbjj_tokens").insert({
      token_hash: hashToken(token),
      kind: "perfil",
      aluno_id: FIXTURES.alunos.ana.id,
      expira_em: new Date(Date.now() - 1000).toISOString(),
    });
    const r = await fetch(`${E2E_URL}/aluno/${token}`);
    expect(r.status).toBe(410);
    const html = await r.text();
    expect(html).toContain("Este link expirou");
    expect(html).not.toContain("Ana Silva");
  });

  it("desconhecido → 404", async () => {
    const r = await fetch(`${E2E_URL}/aluno/nao-existe-nao-existe-nao-existe`);
    expect(r.status).toBe(404);
  });
});
