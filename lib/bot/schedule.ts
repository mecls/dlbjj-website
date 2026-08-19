import { locais, type Aula, type Local } from "@/content/site";
import type { Modalidade, Publico } from "./types";

/**
 * A garantia "nunca inventar uma aula": todas as opções de local e de horário
 * saem exclusivamente das aulas reais em content/site.ts (locais[].aulas).
 *
 * Mapa (publico, modalidade) → tipo de aula:
 *   kids            → aula.tipo === 'kids'   (modalidade é sempre jiu-jitsu)
 *   adulto jiu-jitsu→ 'jiu-jitsu'
 *   adulto mma      → 'mma'
 *   adulto nogi     → 'misto'  (Treino Livre Gi e NoGi)
 */
export function aulaMatches(
  publico: Publico,
  modalidade: Modalidade,
  aula: Aula,
): boolean {
  if (publico === "kids") return aula.tipo === "kids";
  if (modalidade === "jiu-jitsu") return aula.tipo === "jiu-jitsu";
  if (modalidade === "mma") return aula.tipo === "mma";
  if (modalidade === "nogi") return aula.tipo === "misto";
  return false;
}

/** Locais que têm pelo menos uma aula compatível com (publico, modalidade). */
export function locaisPara(publico: Publico, modalidade: Modalidade): Local[] {
  return locais.filter((l) =>
    l.aulas.some((a) => aulaMatches(publico, modalidade, a)),
  );
}

/** Aulas compatíveis num dado local (ordem estável = índice usado nas opções). */
export function aulasPara(
  publico: Publico,
  modalidade: Modalidade,
  localSlug: string,
): Aula[] {
  const l = locais.find((x) => x.slug === localSlug);
  if (!l) return [];
  return l.aulas.filter((a) => aulaMatches(publico, modalidade, a));
}

export function localPorSlug(slug: string): Local | undefined {
  return locais.find((l) => l.slug === slug);
}
