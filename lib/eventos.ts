import "server-only";
import { locais } from "@/content/site";
import { serviceClient } from "@/lib/supabase/service";
import type { EventoCalendario } from "@/lib/aluno/estatisticas";
import { somarDias } from "@/lib/tempo";

/**
 * Eventos da academia (design §6): seminários, graduações, competições… O
 * Daniel cria, edita e cancela (soft) no painel; os alunos veem-nos no
 * calendário. `validarEvento` é puro; o resto fala com a base de dados.
 */
export interface DadosEvento {
  titulo: string;
  descricao: string | null;
  dia: string;
  hora: string | null;
  local_slug: string | null;
}

const SLUGS = locais.map((l) => l.slug);

function diaReal(dia: string): boolean {
  const [y, m, d] = dia.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function validarEvento(c: Record<string, string | undefined>): { ok: true; dados: DadosEvento } | { ok: false; erro: string } {
  const titulo = (c.titulo ?? "").trim();
  if (titulo.length < 2 || titulo.length > 80) return { ok: false, erro: "Título obrigatório (até 80 caracteres)" };
  const dia = (c.dia ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !diaReal(dia)) return { ok: false, erro: "Dia inválido" };
  const hora = (c.hora ?? "").trim();
  if (hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return { ok: false, erro: "Hora inválida" };
  const local = (c.local_slug ?? "").trim();
  if (local && !SLUGS.includes(local)) return { ok: false, erro: "Espaço desconhecido" };
  const descricao = (c.descricao ?? "").trim();
  if (descricao.length > 500) return { ok: false, erro: "Descrição até 500 caracteres" };
  return { ok: true, dados: { titulo, dia, hora: hora || null, local_slug: local || null, descricao: descricao || null } };
}

export interface Evento extends EventoCalendario {
  descricao: string | null;
  cancelado_em: string | null;
}

const TABELA = "dlbjj_eventos";
const COLUNAS = "id,titulo,descricao,dia,hora,local_slug,cancelado_em";

function normalizar(rows: unknown[] | null): Evento[] {
  return ((rows ?? []) as Evento[]).map((e) => ({ ...e, hora: e.hora ? e.hora.slice(0, 5) : null }));
}

/** Eventos não cancelados com `dia` entre `desde` e `ate` (inclusive), por dia e hora. */
export async function listarEventos(desde: string, ate: string): Promise<Evento[]> {
  const { data } = await serviceClient().from(TABELA).select(COLUNAS).is("cancelado_em", null).gte("dia", desde).lte("dia", ate).order("dia").order("hora", { nullsFirst: true });
  return normalizar(data);
}

export async function proximosEventos(hoje: string, n: number): Promise<Evento[]> {
  const { data } = await serviceClient().from(TABELA).select(COLUNAS).is("cancelado_em", null).gte("dia", hoje).order("dia").order("hora", { nullsFirst: true }).limit(n);
  return normalizar(data);
}

/** Para o calendário do painel: o intervalo inteiro, cancelados incluídos (o Daniel vê-os riscados). */
export async function listarEventosDoPainel(desde: string, ate: string): Promise<Evento[]> {
  const { data } = await serviceClient().from(TABELA).select(COLUNAS).gte("dia", desde).lte("dia", ate).order("dia").order("hora", { nullsFirst: true });
  return normalizar(data);
}

export async function eventoPorId(id: string): Promise<Evento | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await serviceClient().from(TABELA).select(COLUNAS).eq("id", id).maybeSingle();
  return data ? normalizar([data])[0] : null;
}

export async function criarEvento(d: DadosEvento): Promise<string> {
  const { data, error } = await serviceClient().from(TABELA).insert(d).select("id").single();
  if (error) throw new Error(`criarEvento: ${error.message}`);
  return data.id as string;
}

export async function editarEvento(id: string, d: DadosEvento): Promise<void> {
  const { error } = await serviceClient().from(TABELA).update(d).eq("id", id);
  if (error) throw new Error(`editarEvento: ${error.message}`);
}

export async function cancelarEvento(id: string): Promise<void> {
  await serviceClient().from(TABELA).update({ cancelado_em: new Date().toISOString() }).eq("id", id).is("cancelado_em", null);
}
