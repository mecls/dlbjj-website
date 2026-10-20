import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { alunosDoTelefone, type AlunoPublico } from "@/lib/alunos/consultas";
import { isProduction, supabaseConfigured } from "@/lib/config";
import { gerarToken, hashToken } from "@/lib/tokens";

/**
 * Sessões da área do aluno (design §5.1): 90 dias, cookie httpOnly com o
 * token em claro, tabela só com o sha256. Terminam no "Sair", na anonimização
 * e quando o aluno deixa de ser ativo/inativo (não aparece em alunosDoTelefone).
 */
export const COOKIE_SESSAO = "dlbjj_aluno";
export const COOKIE_ENTRAR = "dlbjj_entrar";
export const VALIDADE_SESSAO_DIAS = 90;
export const VALIDADE_ENTRAR_S = 600;
const TABELA = "dlbjj_sessoes_aluno";

export interface SessaoRow {
  token_hash: string;
  phone: string;
  aluno_id: string;
  expira_em: string;
  criado_em: string;
  ultimo_uso_em: string | null;
  terminada_em: string | null;
}

export function opcoesCookie(maxAge: number): { httpOnly: true; sameSite: "lax"; secure: boolean; path: "/"; maxAge: number } {
  return { httpOnly: true, sameSite: "lax", secure: isProduction(), path: "/", maxAge };
}

export async function criarSessao(phone: string, alunoId: string): Promise<string> {
  const token = gerarToken();
  const { error } = await serviceClient().from(TABELA).insert({
    token_hash: hashToken(token),
    phone,
    aluno_id: alunoId,
    expira_em: new Date(Date.now() + VALIDADE_SESSAO_DIAS * 86_400_000).toISOString(),
  });
  if (error) throw new Error(`criarSessao: ${error.message}`);
  return token;
}

/** A sessão viva para este token (não terminada, dentro do prazo), ou null. Toca em `ultimo_uso_em`. */
export async function lerSessao(token: string): Promise<SessaoRow | null> {
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) return null;
  const db = serviceClient();
  const agora = new Date().toISOString();
  const { data } = await db.from(TABELA).select("*").eq("token_hash", hashToken(token)).is("terminada_em", null).gt("expira_em", agora).maybeSingle();
  if (!data) return null;
  await db.from(TABELA).update({ ultimo_uso_em: agora }).eq("token_hash", data.token_hash);
  return data as SessaoRow;
}

/** Muda o aluno visto nesta sessão; só para alunos do mesmo telemóvel (irmãos). */
export async function trocarAluno(token: string, alunoId: string): Promise<boolean> {
  const sessao = await lerSessao(token);
  if (!sessao) return false;
  const alunos = await alunosDoTelefone(sessao.phone);
  if (!alunos.some((a) => a.id === alunoId)) return false;
  await serviceClient().from(TABELA).update({ aluno_id: alunoId }).eq("token_hash", sessao.token_hash);
  return true;
}

export async function terminarSessao(token: string): Promise<void> {
  await serviceClient().from(TABELA).update({ terminada_em: new Date().toISOString() }).eq("token_hash", hashToken(token)).is("terminada_em", null);
}

export async function terminarSessoesDe(alunoId: string): Promise<void> {
  await serviceClient().from(TABELA).update({ terminada_em: new Date().toISOString() }).eq("aluno_id", alunoId).is("terminada_em", null);
}

/** Limpeza do cron: sessões expiradas há mais de `dias`. */
export async function apagarSessoesExpiradas(dias = 30): Promise<void> {
  await serviceClient().from(TABELA).delete().lt("expira_em", new Date(Date.now() - dias * 86_400_000).toISOString());
}

export interface ContextoAluno {
  sessao: SessaoRow;
  aluno: AlunoPublico;
  irmaos: AlunoPublico[];
}

/** A sessão do pedido atual (cookie), com o aluno visto e os irmãos do mesmo telemóvel. */
export async function sessaoAluno(): Promise<ContextoAluno | null> {
  if (!supabaseConfigured()) return null;
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  const sessao = await lerSessao(token);
  if (!sessao) return null;
  const alunos = await alunosDoTelefone(sessao.phone);
  const aluno = alunos.find((a) => a.id === sessao.aluno_id);
  if (!aluno) return null; // deixou de ser ativo/inativo (ou foi anonimizado): a sessão não vale
  return { sessao, aluno, irmaos: alunos.filter((a) => a.id !== aluno.id) };
}

export async function requireAluno(): Promise<ContextoAluno> {
  const ctx = await sessaoAluno();
  if (!ctx) redirect("/aluno/entrar");
  return ctx;
}

/** Para route handlers: a sessão, ou um 401 pronto a devolver. */
export async function alunoOu401(): Promise<ContextoAluno | NextResponse> {
  return (await sessaoAluno()) ?? new NextResponse("Não autorizado", { status: 401 });
}
