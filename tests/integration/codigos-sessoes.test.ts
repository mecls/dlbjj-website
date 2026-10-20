import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { emitirCodigo, hashCodigo, verificarCodigo } from "@/lib/aluno/codigos";
import { apagarSessoesExpiradas, criarSessao, lerSessao, terminarSessao, terminarSessoesDe, trocarAluno } from "@/lib/aluno/sessao";

const sb = db();
beforeAll(() => {
  resetDb();
});

describe("códigos de login", () => {
  it("emite 6 dígitos e guarda só o hash", async () => {
    const codigo = await emitirCodigo("351920000001");
    expect(codigo).toMatch(/^\d{6}$/);
    const { data } = await sb.from("dlbjj_codigos_login").select("codigo_hash,tentativas").eq("phone", "351920000001").order("created_at", { ascending: false }).limit(1).single();
    expect(data!.codigo_hash).toBe(hashCodigo("351920000001", codigo));
    expect(data!.codigo_hash).not.toContain(codigo);
  });
  it("errado incrementa; certo usa; usado não volta a servir", async () => {
    const codigo = await emitirCodigo("351920000002");
    expect(await verificarCodigo("351920000002", "000000")).toBe("errado");
    expect(await verificarCodigo("351920000002", codigo)).toBe("ok");
    expect(await verificarCodigo("351920000002", codigo)).toBe("nenhum");
  });
  it("à quinta errada bloqueia, e o certo já não entra", async () => {
    const codigo = await emitirCodigo("351920000003");
    for (let i = 0; i < 4; i++) expect(await verificarCodigo("351920000003", "111111")).toBe("errado");
    expect(await verificarCodigo("351920000003", "111111")).toBe("bloqueado");
    expect(await verificarCodigo("351920000003", codigo)).toBe("bloqueado");
  });
  it("expirado é como se não existisse", async () => {
    const codigo = await emitirCodigo("351920000001");
    await sb.from("dlbjj_codigos_login").update({ expira_em: new Date(Date.now() - 1000).toISOString() }).eq("phone", "351920000001");
    expect(await verificarCodigo("351920000001", codigo)).toBe("nenhum");
  });
});

describe("sessões de aluno", () => {
  it("cria, lê, troca de irmão só dentro do telemóvel, termina", async () => {
    const { joao, ines, ana } = FIXTURES.alunos;
    const token = await criarSessao(joao.phone, joao.id);
    expect(token).toHaveLength(43);
    expect((await lerSessao(token))?.aluno_id).toBe(joao.id);
    expect(await lerSessao("nao-existe")).toBeNull();
    expect(await trocarAluno(token, ana.id)).toBe(false);
    expect(await trocarAluno(token, ines.id)).toBe(true);
    expect((await lerSessao(token))?.aluno_id).toBe(ines.id);
    await terminarSessao(token);
    expect(await lerSessao(token)).toBeNull();
  });
  it("terminarSessoesDe e limpeza das expiradas", async () => {
    const { ana } = FIXTURES.alunos;
    const t1 = await criarSessao(ana.phone, ana.id);
    await terminarSessoesDe(ana.id);
    expect(await lerSessao(t1)).toBeNull();
    const t2 = await criarSessao(ana.phone, ana.id);
    await sb.from("dlbjj_sessoes_aluno").update({ expira_em: new Date(Date.now() - 40 * 86_400_000).toISOString() }).eq("phone", ana.phone);
    await apagarSessoesExpiradas(30);
    const { count } = await sb.from("dlbjj_sessoes_aluno").select("*", { count: "exact", head: true }).eq("phone", ana.phone);
    expect(count).toBe(0);
    expect(await lerSessao(t2)).toBeNull();
  });
});
