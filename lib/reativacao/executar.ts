import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import { sendOutbound } from "@/lib/bot/outbound";
import type { TurmaRow } from "@/lib/bot/checkin";
import { hhmm } from "@/lib/bot/checkin";
import { avaliarRegras, type Acao, type AlunoR, type Contexto, type LeadR, type Regra, type ToqueR } from "./regras";

/** Carrega tudo o que as regras precisam (uma vez por corrida). */
export async function carregarContexto(agora: Date): Promise<Contexto> {
  const db = serviceClient();
  const [{ data: leads }, { data: alunos }, { data: toques }, { data: optOuts }, { data: turmas }, { data: presencas }] = await Promise.all([
    db
      .from("dlbjj_leads")
      .select("id,phone,name,status,step,paused,aluno_id,last_message_at,updated_at")
      .in("status", ["novo", "em_progresso", "concluido"])
      .not("phone", "like", "anon:%"),
    db.from("dlbjj_alunos").select("id,nome,phone,estado,inicio_em,local_slug,modalidade,publico,turma_preferida").eq("estado", "ativo"),
    db.from("dlbjj_toques").select("phone,regra,estado,created_at,enviada_em"),
    db.from("dlbjj_opt_outs").select("phone_hash"),
    db.from("dlbjj_turmas").select("*").eq("ativa", true).order("horario"),
    db.from("dlbjj_presencas").select("aluno_id,data").order("data", { ascending: false }),
  ]);

  const ultima = new Map<string, string>();
  for (const p of presencas ?? []) if (!ultima.has(p.aluno_id)) ultima.set(p.aluno_id, p.data);
  const ts = (turmas ?? []) as TurmaRow[];
  const porId = new Map(ts.map((t) => [t.id, t]));

  const turmaDe = (a: { local_slug: string | null; modalidade: string | null; publico: string | null; turma_preferida: string | null }) => {
    const pref = a.turma_preferida ? porId.get(a.turma_preferida) : undefined;
    const t =
      pref ??
      ts.find((x) => x.local_slug === a.local_slug && (a.publico === "kids" ? x.tipo === "kids" : x.tipo === a.modalidade || (x.tipo === "misto" && a.modalidade !== "mma"))) ??
      ts.find((x) => x.local_slug === a.local_slug);
    return t ? { turma: t.turma, dias: t.dias, horario: hhmm(t.horario) } : null;
  };

  return {
    agora,
    leads: (leads ?? []) as LeadR[],
    alunos: ((alunos ?? []) as (AlunoR & { local_slug: string | null; modalidade: string | null; publico: string | null; turma_preferida: string | null })[]).map((a) => ({
      id: a.id,
      nome: a.nome,
      phone: a.phone,
      estado: a.estado,
      inicio_em: a.inicio_em,
      turma: turmaDe(a),
      ultimaPresenca: ultima.get(a.id) ?? null,
    })),
    toques: (toques ?? []) as ToqueR[],
    optOuts: new Set((optOuts ?? []).map((o) => o.phone_hash as string)),
  };
}

/** Só os toques devidos agora, sem escrever nada (para o painel). */
export async function emAtraso(agora = new Date()): Promise<Extract<Acao, { tipo: "toque" }>[]> {
  const acoes = avaliarRegras(await carregarContexto(agora));
  return acoes.filter((a): a is Extract<Acao, { tipo: "toque" }> => a.tipo === "toque");
}

const TRES_HORAS_MIN = 180;

export async function aplicarAcoes(acoes: Acao[], agora: Date, opts: { imediato?: boolean } = {}): Promise<{ toques: number; perdidos: number; inativos: number }> {
  const db = serviceClient();
  const r = { toques: 0, perdidos: 0, inativos: 0 };
  const toques = acoes.filter((a): a is Extract<Acao, { tipo: "toque" }> => a.tipo === "toque");

  for (const [i, a] of toques.entries()) {
    const espacoMin = opts.imediato ? 0 : Math.round((i * TRES_HORAS_MIN) / Math.max(1, toques.length));
    const enviarApos = new Date(agora.getTime() + espacoMin * 60_000);
    const { filaId } = await sendOutbound({ leadId: a.leadId, alunoId: a.alunoId, to: a.phone, role: "bot", kind: "proativa", regra: a.regra, body: a.corpo, enviarApos });
    await db.from("dlbjj_toques").insert({ phone: a.phone, lead_id: a.leadId, aluno_id: a.alunoId, regra: a.regra, fila_id: filaId, estado: "na_fila" });
    if (a.leadId) await db.from("dlbjj_leads").update({ ultima_regra: a.regra }).eq("id", a.leadId);
    r.toques += 1;
  }
  for (const a of acoes) {
    if (a.tipo === "perdido") {
      await db.from("dlbjj_leads").update({ status: "perdido" }).eq("id", a.leadId);
      r.perdidos += 1;
    } else if (a.tipo === "inativo") {
      await db.from("dlbjj_alunos").update({ estado: "inativo" }).eq("id", a.alunoId);
      r.inativos += 1;
    }
  }
  return r;
}

/** A corrida do cron (de hora a hora). Idempotente: o que já foi tocado não volta a ser. */
export async function correrReativacao(agora = new Date()) {
  const acoes = avaliarRegras(await carregarContexto(agora));
  return aplicarAcoes(acoes, agora);
}

/** Painel: "Enviar agora" para uma pessoa e regra, sem esperar pelo cron. */
export async function enviarAgora(phone: string, regra: Regra, agora = new Date()) {
  const acoes = avaliarRegras(await carregarContexto(agora)).filter((a) => a.tipo === "toque" && a.phone === phone && a.regra === regra);
  return aplicarAcoes(acoes, agora, { imediato: true });
}

/** Painel: "Saltar" — regista um toque saltado, que conta como feito. */
export async function saltar(phone: string, regra: Regra): Promise<void> {
  const db = serviceClient();
  const [{ data: lead }, { data: aluno }] = await Promise.all([
    db.from("dlbjj_leads").select("id").eq("phone", phone).maybeSingle(),
    db.from("dlbjj_alunos").select("id").eq("phone", phone).eq("estado", "ativo").limit(1).maybeSingle(),
  ]);
  await db.from("dlbjj_toques").insert({ phone, lead_id: lead?.id ?? null, aluno_id: aluno?.id ?? null, regra, estado: "saltada" });
}
