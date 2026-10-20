import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { cancelarEvento, criarEvento, editarEvento, eventosDoPainel, listarEventos, proximosEventos } from "@/lib/eventos";
import { hojeLisboa, somarDias } from "@/lib/tempo";

const sb = db();
beforeAll(() => {
  resetDb();
});

describe("eventos", () => {
  it("cria, lista por intervalo, edita, cancela (soft) e some das listas do aluno", async () => {
    const hoje = hojeLisboa();
    const id = await criarEvento({ titulo: "Open Mat", descricao: null, dia: somarDias(hoje, 3), hora: "11:00", local_slug: "sao-bras" });
    expect((await listarEventos(hoje, somarDias(hoje, 7))).map((e) => e.titulo)).toContain("Open Mat");
    await editarEvento(id, { titulo: "Open Mat NoGi", descricao: "Traz rashguard", dia: somarDias(hoje, 3), hora: null, local_slug: null });
    const { data } = await sb.from("dlbjj_eventos").select("titulo,hora,local_slug").eq("id", id).single();
    expect(data).toEqual({ titulo: "Open Mat NoGi", hora: null, local_slug: null });
    expect((await proximosEventos(hoje, 10)).map((e) => e.id)).toEqual(expect.arrayContaining([id, FIXTURES.eventos.seminario.id, FIXTURES.eventos.graduacao.id]));
    await cancelarEvento(id);
    expect((await proximosEventos(hoje, 10)).map((e) => e.id)).not.toContain(id);
    expect((await eventosDoPainel(hoje)).proximos.find((e) => e.id === id)?.cancelado_em).toBeTruthy();
  });
});
