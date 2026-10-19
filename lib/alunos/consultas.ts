import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import type { TurmaRow } from "@/lib/bot/checkin";
import type { Modalidade, Publico } from "@/lib/bot/types";
import { faixaAtual, type Faixa } from "./faixas";

export type AlunoEstado = "ativo" | "inativo" | "ex_aluno" | "anonimizado";

/** As colunas que o motor e as páginas públicas podem ver. SEM saúde nem encarregado. */
export interface AlunoPublico {
  id: string;
  nome: string;
  phone: string;
  publico: Publico | null;
  modalidade: Modalidade | null;
  local_slug: string | null;
  turma_preferida: string | null;
  inicio_em: string | null;
  estado: AlunoEstado;
}

export const COLUNAS_PUBLICAS = "id,nome,phone,publico,modalidade,local_slug,turma_preferida,inicio_em,estado";

/**
 * Alunos (ativos ou inativos) que usam este telemóvel — irmãos partilham o da
 * mãe. Por ordem de entrada na academia (quem treina há mais tempo primeiro),
 * e depois pelo nome, para a lista numerada ser estável.
 */
export async function alunosDoTelefone(phone: string): Promise<AlunoPublico[]> {
  const db = serviceClient();
  const { data } = await db
    .from("dlbjj_alunos")
    .select(COLUNAS_PUBLICAS)
    .eq("phone", phone)
    .in("estado", ["ativo", "inativo"])
    .order("inicio_em", { ascending: true, nullsFirst: false })
    .order("nome");
  return (data ?? []) as AlunoPublico[];
}

export async function alunoPublicoPorId(id: string): Promise<AlunoPublico | null> {
  const db = serviceClient();
  const { data } = await db.from("dlbjj_alunos").select(COLUNAS_PUBLICAS).eq("id", id).maybeSingle();
  return (data as AlunoPublico | null) ?? null;
}

export async function turmasAtivas(): Promise<TurmaRow[]> {
  const db = serviceClient();
  const { data } = await db.from("dlbjj_turmas").select("*").eq("ativa", true).order("horario");
  return (data ?? []) as TurmaRow[];
}

export async function graduacoesDe(alunoId: string) {
  const db = serviceClient();
  const { data } = await db
    .from("dlbjj_graduacoes")
    .select("id,faixa,graus,atribuida_em,nota,created_at")
    .eq("aluno_id", alunoId)
    .order("atribuida_em", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as { id: string; faixa: Faixa; graus: number; atribuida_em: string; nota: string | null; created_at: string }[];
}

export async function faixaAtualDe(alunoId: string) {
  return faixaAtual(await graduacoesDe(alunoId));
}

export async function presencasDe(alunoId: string, desde: string) {
  const db = serviceClient();
  const { data } = await db
    .from("dlbjj_presencas")
    .select("data,origem,dlbjj_turmas(turma,horario,local_slug)")
    .eq("aluno_id", alunoId)
    .gte("data", desde)
    .order("data", { ascending: false });
  return (data ?? []) as unknown as { data: string; origem: string; dlbjj_turmas: { turma: string; horario: string; local_slug: string } | null }[];
}

export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? "").trim().split(/\s+/)[0] || "";
}
