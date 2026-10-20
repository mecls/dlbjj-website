import { localPorSlug } from "@/content/site";
import type { Evento } from "@/lib/eventos";
import { instanteLisboa, somarDias } from "@/lib/tempo";

/**
 * O feed iCalendar dos eventos (ajustes §2.5): um VEVENT por evento, dia
 * inteiro quando não há hora, hora de Lisboa convertida para UTC quando há.
 * Puro; linhas em CRLF; vírgulas, pontos e vírgulas e quebras escapados.
 */
export function escaparIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function utc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function dataIcs(dia: string): string {
  return dia.replace(/-/g, "");
}

export function icsDe(eventos: Evento[], agora: Date): string {
  const linhas: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//DL-BJJ//eventos//PT", "CALSCALE:GREGORIAN", "X-WR-CALNAME:DL-BJJ — eventos"];
  for (const e of eventos) {
    linhas.push("BEGIN:VEVENT", `UID:${e.id}@dlbjj.org`, `DTSTAMP:${utc(agora)}`);
    if (e.hora) {
      const inicio = instanteLisboa(e.dia, e.hora);
      linhas.push(`DTSTART:${utc(inicio)}`, `DTEND:${utc(new Date(inicio.getTime() + 60 * 60_000))}`);
    } else {
      linhas.push(`DTSTART;VALUE=DATE:${dataIcs(e.dia)}`, `DTEND;VALUE=DATE:${dataIcs(somarDias(e.dia, 1))}`);
    }
    linhas.push(`SUMMARY:${escaparIcs(e.titulo)}`);
    if (e.descricao) linhas.push(`DESCRIPTION:${escaparIcs(e.descricao)}`);
    linhas.push(`LOCATION:${escaparIcs(e.local_slug ? (localPorSlug(e.local_slug)?.nome ?? e.local_slug) : "Academia DL-BJJ")}`, "END:VEVENT");
  }
  linhas.push("END:VCALENDAR");
  return linhas.join("\r\n") + "\r\n";
}
