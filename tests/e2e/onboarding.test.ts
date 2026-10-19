import { beforeAll, describe, expect, it } from "vitest";
import { db, resetDb } from "../helpers/db";
import { inject, scenario } from "../helpers/app";

const sb = db();

async function fila(phone: string) {
  const { data } = await sb
    .from("dlbjj_fila_saida")
    .select("kind,corpo,estado")
    .eq("phone", phone)
    .order("created_at", { ascending: true });
  return data ?? [];
}

async function lead(phone: string) {
  const { data } = await sb.from("dlbjj_leads").select("*").eq("phone", phone).single();
  return data!;
}

beforeAll(() => {
  resetDb();
});

describe("Jornada A — onboarding (AC-1)", () => {
  it("adulto → jiu-jitsu → Queluz → 08:00 → Instagram → confirma, só com dígitos", async () => {
    const phone = "351900000101";
    const passos = ["Olá, queria experimentar", "Miguel", "1", "1", "1", "1", "1", "1"];
    for (const text of passos) {
      const r = await inject({ from: phone, text, name: "Miguel Teste" });
      expect(r.status).toBe(200);
    }

    const l = await lead(phone);
    expect(l).toMatchObject({
      status: "concluido",
      step: "concluido",
      name: "Miguel",
      publico: "adulto",
      modalidade: "jiu-jitsu",
      local_slug: "queluz",
      turma: "Jiu-Jitsu (Adultos)",
      horario: "08:00",
      origem: "instagram",
    });

    const rows = await fila(phone);
    expect(rows).toHaveLength(8);
    expect(rows.every((r) => r.kind === "resposta" && r.estado === "pendente")).toBe(true);
    expect(rows[1].corpo).toContain("1. Para mim");
    expect(rows[1].corpo).toContain("2. Para o/a filho/a");
    expect(rows[1].corpo).toContain("(Responde com o número)");
    expect(rows.some((r) => r.corpo.includes("€"))).toBe(false);
    expect(rows[7].corpo).toContain("Perfeito, Miguel!");
  });

  it("kids salta a modalidade e escolhe o espaço BJJ Kids", async () => {
    const { phone } = await scenario("kids");
    const l = await lead(phone);
    expect(l).toMatchObject({ status: "concluido", publico: "kids", modalidade: "jiu-jitsu", local_slug: "kids-amadora", horario: "17:30", origem: "google" });
    const rows = await fila(phone);
    expect(rows).toHaveLength(7);
    expect(rows[2].corpo).toContain("1. Queluz");
    expect(rows[2].corpo).toContain("2. BJJ Kids");
  });

  it("uma pergunta sobre o preço nunca recebe um valor e volta a perguntar", async () => {
    const { phone } = await scenario("pergunta-preco");
    const rows = await fila(phone);
    const ultimas = rows.slice(-2).map((r) => r.corpo);
    expect(ultimas[0]).toContain("primeira aula é grátis");
    expect(ultimas[0]).not.toMatch(/€|\d+ ?euros/);
    expect(ultimas[1]).toContain("1. Para mim");
    const l = await lead(phone);
    expect(l.step).toBe("publico");
  });

  it("uma resposta que não se percebe repete a pergunta com a dica do número", async () => {
    const phone = "351900000102";
    for (const text of ["Olá", "Teresa", "talvez"]) await inject({ from: phone, text });
    const rows = await fila(phone);
    expect(rows[2].corpo).toBe("Desculpa, não percebi bem. 🙂 Responde com o número da opção.");
    expect(rows[3].corpo).toContain("1. Para mim");
  });
});

describe("Áudio e fotos", () => {
  it("um áudio recebe o pedido para escrever e a pergunta repete-se, sem passar pelo modelo (I4)", async () => {
    const phone = "351900000103";
    for (const text of ["Olá", "Vera"]) await inject({ from: phone, text });
    await inject({ from: phone, text: "[áudio]" });
    const rows = await fila(phone);
    expect(rows.at(-2)!.corpo).toBe("Não consigo ouvir áudios. Podes escrever por texto, por favor? 🙏");
    expect(rows.at(-1)!.corpo).toContain("1. Para mim");
    const { data: msgs } = await sb.from("dlbjj_mensagens").select("body").eq("phone", phone).eq("direction", "in");
    expect(msgs!.map((m) => m.body)).toContain("[áudio]");
  });
  it("uma foto sem legenda recebe o aviso de texto", async () => {
    const phone = "351900000104";
    await inject({ from: phone, text: "[foto recebida]" });
    const rows = await fila(phone);
    expect(rows[0].corpo).toBe("Só consigo ler texto. 🙂 Podes escrever?");
  });
});

describe("Jornada A′ — questão sensível passa ao Daniel", () => {
  it("pausa o bot e avisa a pessoa", async () => {
    const { phone } = await scenario("pergunta-sensivel");
    const l = await lead(phone);
    expect(l.paused).toBe(true);
    expect(l.status).toBe("humano");
    const rows = await fila(phone);
    expect(rows.at(-1)!.corpo).toContain("passar isto ao Daniel");
    // Depois de pausado, uma nova mensagem não produz resposta.
    const antes = rows.length;
    await inject({ from: phone, text: "1" });
    expect((await fila(phone)).length).toBe(antes);
  });
});
