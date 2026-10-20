import { describe, expect, it } from "vitest";
import { periodoDe } from "@/lib/aulas/periodo";

const HOJE = "2026-10-20";

describe("periodoDe", () => {
  it("hoje, 7, 30 (por omissão) e 90 dias", () => {
    expect(periodoDe({ dias: "hoje" }, HOJE)).toEqual({ desde: HOJE, ate: HOJE, chave: "hoje", rotulo: "hoje", query: "dias=hoje" });
    expect(periodoDe({ dias: "7" }, HOJE)).toMatchObject({ desde: "2026-10-13", ate: HOJE, chave: "7", rotulo: "7 dias", query: "dias=7" });
    expect(periodoDe({}, HOJE)).toMatchObject({ desde: "2026-09-20", chave: "30", rotulo: "30 dias", query: "dias=30" });
    expect(periodoDe({ dias: "lixo" }, HOJE)).toMatchObject({ chave: "30" });
    expect(periodoDe({ dias: "90" }, HOJE)).toMatchObject({ desde: "2026-07-22", chave: "90", rotulo: "90 dias" });
  });
  it("personalizado com as duas datas válidas e por ordem", () => {
    expect(periodoDe({ desde: "2026-10-01", ate: "2026-10-10" }, HOJE)).toEqual({ desde: "2026-10-01", ate: "2026-10-10", chave: "personalizado", rotulo: "qui 1 out – sáb 10 out", query: "desde=2026-10-01&ate=2026-10-10" });
  });
  it("personalizado inválido cai nos 30 dias", () => {
    expect(periodoDe({ desde: "2026-13-01", ate: "2026-10-10" }, HOJE)).toMatchObject({ chave: "30" });
    expect(periodoDe({ desde: "2026-10-10", ate: "2026-10-01" }, HOJE)).toMatchObject({ chave: "30" });
    expect(periodoDe({ desde: "2026-10-01" }, HOJE)).toMatchObject({ chave: "30" });
  });
});
