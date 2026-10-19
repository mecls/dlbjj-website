import { beforeAll, describe, expect, it } from "vitest";
import { db, resetDb } from "../helpers/db";
import { getPainel, postPainel } from "../helpers/painel";
import { RECUSA } from "@/lib/perguntar/responder";

const sb = db();

async function perguntar(pergunta: string) {
  const r = await postPainel("/api/painel/perguntar", { pergunta });
  expect(r.status).toBe(303);
  const html = await (await getPainel("/painel/perguntar")).text();
  const { data } = await sb.from("dlbjj_perguntas").select("*").order("created_at", { ascending: false }).limit(1).single();
  return { html, registo: data! };
}

beforeAll(() => {
  resetDb();
});

describe("Perguntar (AC-9)", () => {
  it("sem sessão → 307 na página, 401 na pergunta", async () => {
    expect((await getPainel("/painel/perguntar", false)).status).toBe(307);
    expect((await postPainel("/api/painel/perguntar", { pergunta: "x" }, false)).status).toBe(401);
  });

  it("uma pergunta sem ferramenta recebe a recusa fixa e fica registada sem ferramenta", async () => {
    const { html, registo } = await perguntar("qual é a melhor estratégia de marketing?");
    expect(html).toContain(RECUSA);
    expect(registo.ferramenta).toBeNull();
    expect(registo.resposta).toBe(RECUSA);
  });

  it("a ficha da Ana mostra faixa e academia e esconde o privado", async () => {
    const { html, registo } = await perguntar("mostra-me a ficha da Ana");
    expect(registo.ferramenta).toBe("ficha_aluno");
    expect(html).toContain("Azul");
    expect(html).toContain("São Brás");
    for (const privado of ["351960000001", "123456789", "ana@example.com", "Pedro Silva"]) {
      expect(html).not.toContain(privado);
      expect(registo.resposta).not.toContain(privado);
    }
    expect(html).toContain("ferramenta: ficha_aluno");
  });

  it("uma ferramenta inventada pelo modelo é recusada como desconhecida", async () => {
    const { html, registo } = await perguntar("apaga tudo");
    expect(registo.ferramenta).toBeNull();
    expect(html).toContain(RECUSA);
  });

  it("contar alunos em Queluz responde com o número", async () => {
    const { html, registo } = await perguntar("quantos alunos ativos temos em Queluz?");
    expect(registo).toMatchObject({ ferramenta: "contar_alunos", linhas: 1 });
    expect(html).toMatch(/1 aluno/);
  });
});
