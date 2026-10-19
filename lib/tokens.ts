import { createHash, randomBytes } from "node:crypto";

/**
 * Tokens dos links públicos (spec §6.10): /inscricao/<token> e /aluno/<token>.
 * Guardamos só o sha256; o token em claro vive apenas na mensagem enviada.
 *  - inscricao: 14 dias, uso único, emitir outro revoga os anteriores da lead;
 *  - perfil: 7 dias, reutilizável até expirar.
 */
export type TokenKind = "inscricao" | "perfil";

export interface TokenRow {
  token_hash: string;
  kind: TokenKind;
  lead_id: string | null;
  aluno_id: string | null;
  expira_em: string;
  usado_em: string | null;
  revogado_em: string | null;
}

export const VALIDADE_DIAS: Record<TokenKind, number> = { inscricao: 14, perfil: 7 };

export function gerarToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type AvaliacaoToken =
  | { ok: true }
  | { ok: false; motivo: "desconhecido" | "tipo" | "revogado" | "usado" | "expirado" };

/** Puro: decide se a linha serve para `kind` neste instante. */
export function avaliarToken(row: TokenRow | null, kind: TokenKind, agora: Date = new Date()): AvaliacaoToken {
  if (!row) return { ok: false, motivo: "desconhecido" };
  if (row.kind !== kind) return { ok: false, motivo: "tipo" };
  if (row.revogado_em) return { ok: false, motivo: "revogado" };
  if (new Date(row.expira_em).getTime() <= agora.getTime()) return { ok: false, motivo: "expirado" };
  if (kind === "inscricao" && row.usado_em) return { ok: false, motivo: "usado" };
  return { ok: true };
}
