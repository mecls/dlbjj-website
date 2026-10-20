import { beforeAll, describe, expect, it } from "vitest";
import { rankingAulas, rankingAulasEntre } from "@/lib/alunos/aulas";
import { hojeLisboa, somarDias } from "@/lib/tempo";
import { resetDb } from "../helpers/db";

beforeAll(() => {
  resetDb();
});

describe("rankingAulas", () => {
  it("ordena as turmas por presenças no período e conta alunos distintos", async () => {
    const r = await rankingAulas(30);
    expect(r.length).toBe(14);
    expect(r[0]).toMatchObject({ chave: "kids-amadora|Kids|Segunda, Quarta e Sexta|18:30", presencas: 9, alunos: 2 });
    const queluz = r.find((t) => t.chave === "queluz|Jiu-Jitsu (Adultos)|Terça, Quarta e Sexta|08:00")!;
    expect(queluz).toMatchObject({ presencas: 5, alunos: 1 });
    const livre = r.find((t) => t.chave === "sao-bras|Treino Livre (Gi e NoGi)|Sexta-feira|20:00")!;
    expect(livre).toMatchObject({ presencas: 1, alunos: 1 });
    expect(r.at(-1)!.presencas).toBe(0);
  });

  it("um período curto deixa de fora as presenças antigas", async () => {
    const r = await rankingAulas(7);
    const kids = r.find((t) => t.chave === "kids-amadora|Kids|Segunda, Quarta e Sexta|18:30")!;
    expect(kids.presencas).toBe(5); // há 1, 3, 5 (João) e 1, 5 (Inês)
  });
});

describe("rankingAulasEntre", () => {
  it("conta só dentro do intervalo (inclusive)", async () => {
    const hoje = hojeLisboa();
    const r = await rankingAulasEntre(somarDias(hoje, -3), somarDias(hoje, -1));
    const queluz = r.find((t) => t.chave === "queluz|Jiu-Jitsu (Adultos)|Terça, Quarta e Sexta|08:00")!;
    expect(queluz.presencas).toBe(2); // o Rui há 1 e há 3 dias; há 8 fica de fora
    const hojeSo = await rankingAulasEntre(hoje, hoje);
    expect(hojeSo.every((t) => t.presencas === 0)).toBe(true); // o seed não tem presenças de hoje
  });
});
