import "server-only";
import { createHash, randomInt } from "node:crypto";
import { serviceClient } from "@/lib/supabase/service";

/**
 * Códigos de 6 dígitos para entrar na área do aluno (design §5.1, §8).
 * Guardamos só o sha256 de "telemóvel:código"; 10 minutos; 5 tentativas.
 */
export const VALIDADE_CODIGO_MIN = 10;
export const MAX_TENTATIVAS = 5;
const TABELA = "dlbjj_codigos_login";

export function gerarCodigo(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCodigo(phone: string, codigo: string): string {
  return createHash("sha256").update(`${phone}:${codigo}`).digest("hex");
}

/** Emite um código novo para este telemóvel e devolve-o em claro (vai para a fila). */
export async function emitirCodigo(phone: string): Promise<string> {
  const codigo = gerarCodigo();
  const { error } = await serviceClient().from(TABELA).insert({
    phone,
    codigo_hash: hashCodigo(phone, codigo),
    expira_em: new Date(Date.now() + VALIDADE_CODIGO_MIN * 60_000).toISOString(),
  });
  if (error) throw new Error(`emitirCodigo: ${error.message}`);
  return codigo;
}

export type ResultadoCodigo = "ok" | "errado" | "bloqueado" | "nenhum";

/**
 * Compara com o código mais recente, por usar e dentro do prazo. Errado soma
 * uma tentativa; à quinta o código morre ("bloqueado") e nem o certo entra.
 */
export async function verificarCodigo(phone: string, codigo: string): Promise<ResultadoCodigo> {
  const db = serviceClient();
  const { data: row } = await db
    .from(TABELA)
    .select("id,codigo_hash,tentativas")
    .eq("phone", phone)
    .is("usado_em", null)
    .gt("expira_em", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return "nenhum";
  if (row.tentativas >= MAX_TENTATIVAS) return "bloqueado";
  if (row.codigo_hash !== hashCodigo(phone, codigo.trim())) {
    const tentativas = row.tentativas + 1;
    await db.from(TABELA).update({ tentativas }).eq("id", row.id);
    return tentativas >= MAX_TENTATIVAS ? "bloqueado" : "errado";
  }
  await db.from(TABELA).update({ usado_em: new Date().toISOString() }).eq("id", row.id);
  return "ok";
}

export async function apagarCodigosDe(phone: string): Promise<void> {
  await serviceClient().from(TABELA).delete().eq("phone", phone);
}

/** Limpeza do cron: códigos com mais de `horas` já não servem para nada. */
export async function apagarCodigosAntigos(horas = 24): Promise<void> {
  await serviceClient().from(TABELA).delete().lt("created_at", new Date(Date.now() - horas * 3_600_000).toISOString());
}
