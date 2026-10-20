import { describe, expect, it } from "vitest";
import { validarEvento } from "@/lib/eventos";

describe("validarEvento", () => {
  it("aceita o mínimo e normaliza vazios para null", () => {
    expect(validarEvento({ titulo: " Seminário ", dia: "2026-11-08", hora: "", local_slug: "", descricao: "" })).toEqual({
      ok: true,
      dados: { titulo: "Seminário", dia: "2026-11-08", hora: null, local_slug: null, descricao: null },
    });
  });
  it("recusa título curto, dia e hora inválidos, espaço desconhecido, descrição longa", () => {
    expect(validarEvento({ titulo: "A", dia: "2026-11-08" })).toMatchObject({ ok: false, erro: "Título obrigatório (até 80 caracteres)" });
    expect(validarEvento({ titulo: "Seminário", dia: "2026-02-30" })).toMatchObject({ ok: false, erro: "Dia inválido" });
    expect(validarEvento({ titulo: "Seminário", dia: "2026-11-08", hora: "25:00" })).toMatchObject({ ok: false, erro: "Hora inválida" });
    expect(validarEvento({ titulo: "Seminário", dia: "2026-11-08", local_slug: "lisboa" })).toMatchObject({ ok: false, erro: "Espaço desconhecido" });
    expect(validarEvento({ titulo: "Seminário", dia: "2026-11-08", descricao: "x".repeat(501) })).toMatchObject({ ok: false, erro: "Descrição até 500 caracteres" });
  });
});
