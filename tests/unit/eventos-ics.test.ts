import { describe, expect, it } from "vitest";
import { icsDe } from "@/lib/eventos-ics";
import type { Evento } from "@/lib/eventos";

const ev = (o: Partial<Evento>): Evento => ({ id: "11111111-1111-1111-1111-111111111111", titulo: "Seminário", descricao: null, dia: "2026-11-08", hora: null, local_slug: null, cancelado_em: null, ...o });

describe("icsDe", () => {
  it("dia inteiro, com hora (Lisboa → UTC), escapes e CRLF", () => {
    const ics = icsDe([ev({}), ev({ id: "22222222-2222-2222-2222-222222222222", titulo: "Open Mat, NoGi; livre", descricao: "Traz rashguard\nE água", hora: "19:00", local_slug: "sao-bras", dia: "2026-07-10" })], new Date("2026-10-20T12:00:00Z"));
    expect(ics.split("\r\n")).toContain("DTSTART;VALUE=DATE:20261108");
    expect(ics).toContain("DTEND;VALUE=DATE:20261109");
    expect(ics).toContain("DTSTART:20260710T180000Z"); // 19:00 em Lisboa (verão) = 18:00Z
    expect(ics).toContain("DTEND:20260710T190000Z");
    expect(ics).toContain("SUMMARY:Open Mat\\, NoGi\; livre");
    expect(ics).toContain("DESCRIPTION:Traz rashguard\\nE água");
    expect(ics).toContain("LOCATION:São Brás");
    expect(ics).toContain("LOCATION:Academia DL-BJJ");
    expect(ics).toContain("UID:11111111-1111-1111-1111-111111111111@dlbjj.org");
    expect(ics).toContain("DTSTAMP:20261020T120000Z");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
