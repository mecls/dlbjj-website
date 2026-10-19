export const FAIXAS = ["branca", "cinzenta", "amarela", "laranja", "verde", "azul", "roxa", "castanha", "preta"] as const;
export type Faixa = (typeof FAIXAS)[number];

export const FAIXA_LABEL: Record<Faixa, string> = {
  branca: "Branca",
  cinzenta: "Cinzenta",
  amarela: "Amarela",
  laranja: "Laranja",
  verde: "Verde",
  azul: "Azul",
  roxa: "Roxa",
  castanha: "Castanha",
  preta: "Preta",
};

export interface Graduacao {
  faixa: Faixa;
  graus: number;
  atribuida_em: string;
  created_at?: string;
}

/** A faixa atual é a última por `atribuida_em`, e depois por `created_at`. */
export function faixaAtual<T extends Graduacao>(graduacoes: T[]): T | null {
  if (graduacoes.length === 0) return null;
  return [...graduacoes].sort((a, b) => {
    const d = b.atribuida_em.localeCompare(a.atribuida_em);
    if (d !== 0) return d;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  })[0];
}

export function descreverFaixa(g: Graduacao | null): string {
  if (!g) return "—";
  const graus = g.graus > 0 ? ` · ${g.graus} ${g.graus === 1 ? "grau" : "graus"}` : "";
  return `${FAIXA_LABEL[g.faixa]}${graus}`;
}
