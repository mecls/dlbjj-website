import { beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { filaDe, inject } from "../helpers/app";

const sb = db();

beforeAll(() => {
  resetDb();
});

describe("Jornada D′ — opt-out (AC-2, metade da app)", () => {
  it("regista o hash, cancela as proativas pendentes e responde uma vez", async () => {
    const { phone } = FIXTURES.leads.concluido; // Carla
    await sb.from("dlbjj_fila_saida").insert({ phone, kind: "proativa", regra: "R3", corpo: "Olá Carla! Correu bem…" });

    await inject({ from: phone, text: "não quero mais mensagens" });

    const hash = createHash("sha256").update(phone).digest("hex");
    const { data: opt } = await sb.from("dlbjj_opt_outs").select("phone_hash").eq("phone_hash", hash).single();
    expect(opt).not.toBeNull();

    const fila = await filaDe(sb, phone);
    const proativa = fila.find((r) => r.kind === "proativa")!;
    expect(proativa).toMatchObject({ estado: "cancelada", erro: "opt-out" });
    const respostas = fila.filter((r) => r.kind === "resposta");
    expect(respostas).toHaveLength(1);
    expect(respostas[0].corpo).toBe("Entendido, Carla. Não voltamos a enviar-te mensagens. Se mudares de ideias, é só escrever. 🙏");
  });

  it("um segundo opt-out não produz segunda resposta", async () => {
    const { phone } = FIXTURES.leads.concluido;
    await inject({ from: phone, text: "parar" });
    const fila = await filaDe(sb, phone);
    expect(fila.filter((r) => r.kind === "resposta")).toHaveLength(1);
  });

  it("'não quero MMA' a meio do guião não é opt-out", async () => {
    const phone = "351900000401";
    for (const t of ["Olá", "Nuno", "1"]) await inject({ from: phone, text: t });
    await inject({ from: phone, text: "não quero MMA, quero jiu-jitsu" });
    const { data } = await sb.from("dlbjj_opt_outs").select("phone_hash").eq("phone_hash", createHash("sha256").update(phone).digest("hex"));
    expect(data).toEqual([]);
  });
});
