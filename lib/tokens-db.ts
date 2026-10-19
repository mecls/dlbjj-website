import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import { avaliarToken, gerarToken, hashToken, VALIDADE_DIAS, type AvaliacaoToken, type TokenKind, type TokenRow } from "./tokens";

const TOKENS = "dlbjj_tokens";

/** Emite um token novo. Para `inscricao`, revoga os anteriores da mesma lead. */
export async function emitirToken(kind: TokenKind, alvo: { leadId?: string; alunoId?: string }): Promise<string> {
  const db = serviceClient();
  const token = gerarToken();
  const expira = new Date(Date.now() + VALIDADE_DIAS[kind] * 24 * 60 * 60 * 1000);

  if (kind === "inscricao" && alvo.leadId) {
    await db
      .from(TOKENS)
      .update({ revogado_em: new Date().toISOString() })
      .eq("kind", "inscricao")
      .eq("lead_id", alvo.leadId)
      .is("revogado_em", null)
      .is("usado_em", null);
  }

  const { error } = await db.from(TOKENS).insert({
    token_hash: hashToken(token),
    kind,
    lead_id: alvo.leadId ?? null,
    aluno_id: alvo.alunoId ?? null,
    expira_em: expira.toISOString(),
  });
  if (error) throw new Error(`emitirToken: ${error.message}`);
  return token;
}

/** Procura e avalia um token. Devolve a linha quando serve. */
export async function verificarToken(
  token: string,
  kind: TokenKind,
): Promise<{ avaliacao: AvaliacaoToken; row: TokenRow | null }> {
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) return { avaliacao: { ok: false, motivo: "desconhecido" }, row: null };
  const db = serviceClient();
  const { data } = await db.from(TOKENS).select("*").eq("token_hash", hashToken(token)).maybeSingle();
  const row = (data as TokenRow | null) ?? null;
  return { avaliacao: avaliarToken(row, kind), row };
}

export async function marcarTokenUsado(token: string): Promise<void> {
  const db = serviceClient();
  await db.from(TOKENS).update({ usado_em: new Date().toISOString() }).eq("token_hash", hashToken(token));
}

/**
 * Reclama um token de inscrição ATOMICAMENTE: um UPDATE condicional que só
 * apanha a linha se ainda estiver por usar, por revogar e dentro do prazo.
 * Dois pedidos ao mesmo tempo → só um recebe a linha; o outro vê 410.
 */
export async function reclamarTokenInscricao(token: string): Promise<TokenRow | null> {
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) return null;
  const db = serviceClient();
  const agora = new Date().toISOString();
  const { data } = await db
    .from(TOKENS)
    .update({ usado_em: agora })
    .eq("token_hash", hashToken(token))
    .eq("kind", "inscricao")
    .is("usado_em", null)
    .is("revogado_em", null)
    .gt("expira_em", agora)
    .select("*")
    .maybeSingle();
  return (data as TokenRow | null) ?? null;
}

/** Devolve um token reclamado cujo trabalho falhou, para a pessoa poder tentar outra vez. */
export async function devolverToken(token: string): Promise<void> {
  await serviceClient().from(TOKENS).update({ usado_em: null }).eq("token_hash", hashToken(token));
}
