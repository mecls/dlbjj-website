import { describe, expect, it } from "vitest";
import { dataPt, diaCurto, diaMes, mesAno } from "@/lib/datas-pt";

describe("datas em pt-PT", () => {
  it("formata", () => {
    expect(dataPt("2026-10-19")).toBe("19 de outubro de 2026");
    expect(diaMes("2026-10-05")).toBe("5 de outubro");
    expect(mesAno("2024-02")).toBe("fevereiro de 2024");
    expect(mesAno("2024-02-01")).toBe("fevereiro de 2024");
    expect(diaCurto("2026-10-19")).toBe("seg 19 out");
    expect(diaCurto("2026-10-25")).toBe("dom 25 out");
  });
});
