import { beforeAll, describe, expect, it } from "vitest";
import { executarFerramenta } from "@/lib/perguntar/ferramentas";
import { resetDb } from "../helpers/db";

const PRIVADOS = ["phone", "email", "morada", "nif", "enc_nome", "enc_telefone", "enc_relacao", "contacto_emergencia_nome", "contacto_emergencia_telefone", "condicoes_saude", "notas", "data_nascimento"];

beforeAll(() => {
  resetDb();
});

describe("ferramentas de leitura", () => {
  it("ficha_aluno nunca devolve colunas privadas", async () => {
    const r = await executarFerramenta({ ferramenta: "ficha_aluno", argumentos: { nome: "João" } });
    expect(r.linhas).toHaveLength(1);
    const chaves = Object.keys(r.linhas[0]);
    for (const p of PRIVADOS) expect(chaves, p).not.toContain(p);
    expect(r.linhas[0]).toMatchObject({ nome: "João Pereira", academia: "BJJ Kids", faixa: "Cinzenta", estado: "ativo" });
    expect(JSON.stringify(r.linhas)).not.toContain("asma");
    expect(JSON.stringify(r.linhas)).not.toContain("Marta");
  });

  it("ficha_aluno ambíguo devolve até 5 candidatos", async () => {
    const r = await executarFerramenta({ ferramenta: "ficha_aluno", argumentos: { nome: "Pereira" } });
    expect(r.linhas.map((l) => (l as { nome: string }).nome).sort()).toEqual(["Inês Pereira", "João Pereira"]);
  });

  it("contar_alunos por academia e estado", async () => {
    const r = await executarFerramenta({ ferramenta: "contar_alunos", argumentos: { academia: "queluz", estado: "ativo" } });
    expect(r.linhas).toEqual([{ total: 1 }]);
    const todos = await executarFerramenta({ ferramenta: "contar_alunos", argumentos: {} });
    expect(todos.linhas).toEqual([{ total: 4 }]);
  });

  it("presencas_por_turma é o ranking", async () => {
    const r = await executarFerramenta({ ferramenta: "presencas_por_turma", argumentos: { dias: 30 } });
    expect(r.linhas[0]).toMatchObject({ turma: "Kids", local: "BJJ Kids", presencas: 9, alunos: 2 });
  });

  it("alunos_em_risco lista quem não treina há N dias (ninguém do seed com 14)", async () => {
    const r = await executarFerramenta({ ferramenta: "alunos_em_risco", argumentos: { dias: 14 } });
    expect(r.linhas).toEqual([]);
    const r2 = await executarFerramenta({ ferramenta: "alunos_em_risco", argumentos: { dias: 1 } });
    expect(r2.linhas.length).toBeGreaterThan(0);
    for (const l of r2.linhas) for (const p of PRIVADOS) expect(Object.keys(l)).not.toContain(p);
  });

  it("leads_por_estado e leads_por_origem contam", async () => {
    const r = await executarFerramenta({ ferramenta: "leads_por_estado", argumentos: { dias: 30 } });
    expect(r.linhas).toEqual(expect.arrayContaining([{ estado: "novo", total: 1 }, { estado: "em_progresso", total: 1 }, { estado: "concluido", total: 1 }]));
    const o = await executarFerramenta({ ferramenta: "leads_por_origem", argumentos: { dias: 30 } });
    expect(o.linhas).toEqual(expect.arrayContaining([{ origem: "google", total: 1 }]));
  });

  it("proximas_aulas devolve 5 aulas com dia e hora", async () => {
    const r = await executarFerramenta({ ferramenta: "proximas_aulas", argumentos: { academia: "queluz" } });
    expect(r.linhas).toHaveLength(5);
    expect(r.linhas[0]).toMatchObject({ local: "Queluz" });
    expect(Object.keys(r.linhas[0])).toEqual(expect.arrayContaining(["dia", "hora", "turma"]));
  });
});
