import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { avaliarRegras, type AlunoR, type Contexto, type LeadR, type ToqueR } from "@/lib/reativacao/regras";

const AGORA = new Date("2026-11-03T10:00:00Z");
const h = (n: number) => new Date(AGORA.getTime() - n * 3_600_000).toISOString();
const d = (n: number) => new Date(AGORA.getTime() - n * 86_400_000).toISOString().slice(0, 10);

const lead = (o: Partial<LeadR>): LeadR => ({
  id: "l1",
  phone: "351910000001",
  name: "Bruno Teste",
  status: "em_progresso",
  step: "horario",
  paused: false,
  aluno_id: null,
  last_message_at: h(30),
  updated_at: h(30),
  ...o,
});
const aluno = (o: Partial<AlunoR>): AlunoR => ({
  id: "a1",
  nome: "Ana Silva",
  phone: "351920000001",
  estado: "ativo",
  inicio_em: "2024-02-01",
  turma: { turma: "Jiu-Jitsu", dias: "Segunda e Quarta", horario: "19:30" },
  ultimaPresenca: null,
  ...o,
});
const toque = (o: Partial<ToqueR>): ToqueR => ({ phone: "351910000001", regra: "R1", estado: "enviada", created_at: h(1), enviada_em: h(1), ...o });

function ctx(o: Partial<Contexto>): Contexto {
  return { agora: AGORA, leads: [], alunos: [], toques: [], optOuts: new Set(), escolher: (v) => v[0], ...o };
}

describe("regras de reativação (spec §5.1)", () => {
  it("R1: lead a meio há mais de 24 h recebe o primeiro toque, com o primeiro nome", () => {
    const a = avaliarRegras(ctx({ leads: [lead({})] }));
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ tipo: "toque", regra: "R1", leadId: "l1", phone: "351910000001" });
    expect((a[0] as { corpo: string }).corpo).toContain("Olá Bruno!");
    expect((a[0] as { corpo: string }).corpo).toContain("aula grátis");
  });

  it("R1 não dispara antes das 24 h, nem com a lead pausada, nem já com R1", () => {
    expect(avaliarRegras(ctx({ leads: [lead({ last_message_at: h(20) })] }))).toEqual([]);
    expect(avaliarRegras(ctx({ leads: [lead({ paused: true })] }))).toEqual([]);
    expect(avaliarRegras(ctx({ leads: [lead({})], toques: [toque({})] }))).toEqual([]);
  });

  it("R2 às 72 h depois de R1; perdido aos 7 dias depois de R2", () => {
    const a = avaliarRegras(ctx({ leads: [lead({ last_message_at: h(80) })], toques: [toque({ regra: "R1", created_at: h(50) })] }));
    expect(a[0]).toMatchObject({ tipo: "toque", regra: "R2" });
    expect((a[0] as { corpo: string }).corpo).toContain("*parar*");
    const semR1 = avaliarRegras(ctx({ leads: [lead({ last_message_at: h(80) })] }));
    expect(semR1[0]).toMatchObject({ regra: "R1" });
    const perdido = avaliarRegras(ctx({ leads: [lead({ last_message_at: h(24 * 8) })], toques: [toque({ regra: "R1" }), toque({ regra: "R2" })] }));
    expect(perdido).toEqual([{ tipo: "perdido", leadId: "l1" }]);
  });

  it("R3: lead concluída sem inscrição há 10 dias, uma vez", () => {
    const l = lead({ status: "concluido", step: "concluido", updated_at: h(24 * 11), last_message_at: h(24 * 11) });
    const a = avaliarRegras(ctx({ leads: [l] }));
    expect(a[0]).toMatchObject({ tipo: "toque", regra: "R3" });
    expect(avaliarRegras(ctx({ leads: [l], toques: [toque({ regra: "R3" })] }))).toEqual([]);
    expect(avaliarRegras(ctx({ leads: [lead({ status: "concluido", updated_at: h(24 * 5) })] }))).toEqual([]);
    expect(avaliarRegras(ctx({ leads: [lead({ status: "concluido", updated_at: h(24 * 11), aluno_id: "a1" })] }))).toEqual([]);
  });

  it("R4: aluno sem presença há 14 dias, com a aula no texto, no máximo uma vez por 30 dias", () => {
    const a = avaliarRegras(ctx({ alunos: [aluno({ ultimaPresenca: d(15) })] }));
    expect(a[0]).toMatchObject({ tipo: "toque", regra: "R4", alunoId: "a1", phone: "351920000001" });
    const corpo = (a[0] as { corpo: string }).corpo;
    expect(corpo).toContain("Olá Ana!");
    expect(corpo).toContain("Jiu-Jitsu");
    expect(corpo).toContain("Segunda e Quarta");
    expect(corpo).toContain("19:30");
    expect(avaliarRegras(ctx({ alunos: [aluno({ ultimaPresenca: d(10) })] }))).toEqual([]);
    expect(avaliarRegras(ctx({ alunos: [aluno({ ultimaPresenca: d(15) })], toques: [toque({ phone: "351920000001", regra: "R4", created_at: h(24 * 20) })] }))).toEqual([]);
    // Voltou a treinar depois de um R4 antigo e desapareceu outra vez: novo R4 passados 30 dias.
    const velho = avaliarRegras(ctx({ alunos: [aluno({ ultimaPresenca: d(15) })], toques: [toque({ phone: "351920000001", regra: "R4", created_at: h(24 * 31) })] }));
    expect(velho.some((x) => x.tipo === "toque" && x.regra === "R4")).toBe(true);
    // Ausente há 45 dias com um R4 há 31: é um R5, não outro R4.
    const r5 = avaliarRegras(ctx({ alunos: [aluno({ ultimaPresenca: d(45) })], toques: [toque({ phone: "351920000001", regra: "R4", created_at: h(24 * 31) })] }));
    expect(r5.map((x) => (x.tipo === "toque" ? x.regra : x.tipo))).toEqual(["R5", "inativo"]);
  });

  it("R4 conta desde o início quando nunca houve presença", () => {
    expect(avaliarRegras(ctx({ alunos: [aluno({ inicio_em: d(10), ultimaPresenca: null })] }))).toEqual([]);
    expect(avaliarRegras(ctx({ alunos: [aluno({ inicio_em: d(20), ultimaPresenca: null })] }))[0]).toMatchObject({ regra: "R4" });
  });

  it("R5: aos 30 dias, com R4 há ≥ 14 dias, envia e marca inativo; nunca mais de uma vez por 90 dias", () => {
    const al = aluno({ ultimaPresenca: d(31) });
    const a = avaliarRegras(ctx({ alunos: [al], toques: [toque({ phone: al.phone, regra: "R4", created_at: h(24 * 15) })] }));
    expect(a).toEqual([
      expect.objectContaining({ tipo: "toque", regra: "R5", alunoId: "a1" }),
      { tipo: "inativo", alunoId: "a1" },
    ]);
    expect((a[0] as { corpo: string }).corpo).toContain("sente a tua falta");
    const cedo = avaliarRegras(ctx({ alunos: [al], toques: [toque({ phone: al.phone, regra: "R4", created_at: h(24 * 10) })] }));
    expect(cedo.some((x) => x.tipo === "toque" && x.regra === "R5")).toBe(false);
    const repetido = avaliarRegras(ctx({ alunos: [al], toques: [toque({ phone: al.phone, regra: "R4", created_at: h(24 * 15) }), toque({ phone: al.phone, regra: "R5", created_at: h(24 * 2) })] }));
    expect(repetido.some((x) => x.tipo === "toque")).toBe(false);
  });

  it("opt-out e números anonimizados nunca recebem toques", () => {
    const hash = createHash("sha256").update("351910000001").digest("hex");
    expect(avaliarRegras(ctx({ leads: [lead({})], optOuts: new Set([hash]) }))).toEqual([]);
    expect(avaliarRegras(ctx({ leads: [lead({ phone: "anon:abc" })] }))).toEqual([]);
  });

  it("um toque saltado também conta como já tocado", () => {
    expect(avaliarRegras(ctx({ leads: [lead({})], toques: [toque({ estado: "saltada", enviada_em: null })] }))).toEqual([]);
  });

  it("as variantes alternam de forma determinista quando `escolher` o diz", () => {
    const a = avaliarRegras(ctx({ leads: [lead({})], escolher: (v) => v[1] }));
    const b = avaliarRegras(ctx({ leads: [lead({})], escolher: (v) => v[0] }));
    expect((a[0] as { corpo: string }).corpo).not.toBe((b[0] as { corpo: string }).corpo);
  });
});
