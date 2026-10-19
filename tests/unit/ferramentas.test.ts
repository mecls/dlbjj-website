import { describe, expect, it } from "vitest";
import { NOMES_FERRAMENTAS, validarEscolha } from "@/lib/perguntar/catalogo";

describe("catálogo de ferramentas (spec §5.4)", () => {
  it("tem exatamente estas dez ferramentas, só de leitura", () => {
    expect([...NOMES_FERRAMENTAS].sort()).toEqual(
      ["alunos_em_risco", "contar_alunos", "ficha_aluno", "historico_faixas", "leads_por_estado", "leads_por_origem", "listar_alunos", "presencas_aluno", "presencas_por_turma", "proximas_aulas"].sort(),
    );
  });

  it("recusa um nome fora do catálogo e um JSON sem ferramenta", () => {
    expect(validarEscolha({ ferramenta: "drop_tables", argumentos: {} })).toBeNull();
    expect(validarEscolha({ ferramenta: null })).toBeNull();
    expect(validarEscolha("lixo")).toBeNull();
  });

  it("aceita uma escolha válida e normaliza os argumentos", () => {
    expect(validarEscolha({ ferramenta: "contar_alunos", argumentos: { academia: "queluz", estado: "ativo" } })).toEqual({
      ferramenta: "contar_alunos",
      argumentos: { academia: "queluz", estado: "ativo" },
    });
    expect(validarEscolha({ ferramenta: "listar_alunos", argumentos: { limite: 500 } })).toEqual({ ferramenta: "listar_alunos", argumentos: { limite: 50 } });
    expect(validarEscolha({ ferramenta: "presencas_por_turma", argumentos: { dias: 45 } })).toEqual({ ferramenta: "presencas_por_turma", argumentos: { dias: 30 } });
    expect(validarEscolha({ ferramenta: "ficha_aluno", argumentos: { nome: "  Ana " } })).toEqual({ ferramenta: "ficha_aluno", argumentos: { nome: "Ana" } });
    expect(validarEscolha({ ferramenta: "ficha_aluno", argumentos: {} })).toBeNull();
  });

  it("ignora argumentos que a ferramenta não conhece", () => {
    expect(validarEscolha({ ferramenta: "contar_alunos", argumentos: { academia: "queluz", sql: "drop" } })).toEqual({ ferramenta: "contar_alunos", argumentos: { academia: "queluz" } });
  });
});
