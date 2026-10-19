import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import { faixaAtual, type Faixa, type Graduacao } from "./faixas";
import type { AlunoEstado } from "./consultas";

export interface Filtros {
  academia?: string;
  estado?: string;
  faixa?: string;
  q?: string;
}

export interface AlunoLista {
  id: string;
  nome: string;
  local_slug: string | null;
  estado: AlunoEstado;
  faixa: (Graduacao & { id: string }) | null;
  ultimoCheckin: string | null;
}

/** Lista do painel: sem encarregado, saúde ou contactos (só o que a tabela mostra). */
export async function listarAlunos(f: Filtros): Promise<AlunoLista[]> {
  const db = serviceClient();
  let q = db.from("dlbjj_alunos").select("id,nome,local_slug,estado").neq("estado", "anonimizado").order("nome");
  if (f.academia) q = q.eq("local_slug", f.academia);
  if (f.estado) q = q.eq("estado", f.estado);
  if (f.q) q = q.ilike("nome", `%${f.q.replace(/[%_]/g, "")}%`);
  const { data: alunos } = await q;
  const ids = (alunos ?? []).map((a) => a.id);
  if (ids.length === 0) return [];

  const [{ data: grads }, { data: pres }] = await Promise.all([
    db.from("dlbjj_graduacoes").select("id,aluno_id,faixa,graus,atribuida_em,created_at").in("aluno_id", ids),
    db.from("dlbjj_presencas").select("aluno_id,data").in("aluno_id", ids).order("data", { ascending: false }),
  ]);
  const porAluno = new Map<string, (Graduacao & { id: string })[]>();
  for (const g of grads ?? []) (porAluno.get(g.aluno_id) ?? porAluno.set(g.aluno_id, []).get(g.aluno_id)!).push(g as Graduacao & { id: string; faixa: Faixa });
  const ultimo = new Map<string, string>();
  for (const p of pres ?? []) if (!ultimo.has(p.aluno_id)) ultimo.set(p.aluno_id, p.data);

  return (alunos ?? [])
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      local_slug: a.local_slug,
      estado: a.estado as AlunoEstado,
      faixa: faixaAtual(porAluno.get(a.id) ?? []),
      ultimoCheckin: ultimo.get(a.id) ?? null,
    }))
    .filter((a) => !f.faixa || a.faixa?.faixa === f.faixa);
}

export async function alunoCompleto(id: string) {
  const db = serviceClient();
  const { data } = await db.from("dlbjj_alunos").select("*").eq("id", id).maybeSingle();
  return data as Record<string, unknown> & { id: string; nome: string; phone: string; estado: AlunoEstado } | null;
}
