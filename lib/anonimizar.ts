import "server-only";
import { createHash } from "node:crypto";
import { serviceClient } from "@/lib/supabase/service";
import { hojeLisboa, somarDias } from "@/lib/tempo";

/**
 * Anonimização (spec §6.11): nunca se apaga; substitui-se o que identifica a
 * pessoa. Faixas, presenças e toques ficam (não têm nome); os opt-outs ficam
 * sempre. As mensagens perdem o corpo. A lead do mesmo telemóvel vai junto.
 */
const anon = (phone: string) => `anon:${createHash("sha256").update(phone).digest("hex")}`;

const CAMPOS_NULOS = {
  data_nascimento: null,
  email: null,
  morada: null,
  nif: null,
  experiencia_previa: null,
  enc_nome: null,
  enc_telefone: null,
  enc_relacao: null,
  contacto_emergencia_nome: null,
  contacto_emergencia_telefone: null,
  condicoes_saude: null,
  notas: null,
};

export async function anonimizarAluno(id: string): Promise<void> {
  const db = serviceClient();
  const { data: aluno } = await db.from("dlbjj_alunos").select("phone,estado").eq("id", id).maybeSingle();
  if (!aluno || aluno.estado === "anonimizado") return;
  const phone = aluno.phone as string;
  const outros = await db.from("dlbjj_alunos").select("id").eq("phone", phone).neq("id", id).neq("estado", "anonimizado");
  const partilhado = (outros.data?.length ?? 0) > 0; // irmão ainda ativo no mesmo telemóvel

  await db.from("dlbjj_alunos").update({ nome: "Aluno anonimizado", phone: anon(phone), estado: "anonimizado", ...CAMPOS_NULOS }).eq("id", id);
  await db.from("dlbjj_tokens").update({ revogado_em: new Date().toISOString() }).eq("aluno_id", id).is("revogado_em", null);

  if (!partilhado) await anonimizarTelefone(phone);
}

export async function anonimizarLead(id: string): Promise<void> {
  const db = serviceClient();
  const { data: lead } = await db.from("dlbjj_leads").select("phone").eq("id", id).maybeSingle();
  if (!lead || (lead.phone as string).startsWith("anon:")) return;
  await anonimizarTelefone(lead.phone as string);
}

async function anonimizarTelefone(phone: string): Promise<void> {
  const db = serviceClient();
  const a = anon(phone);
  await db.from("dlbjj_mensagens").update({ body: "[anonimizado]", media_url: null, phone: a }).eq("phone", phone);
  await db.from("dlbjj_leads").update({ name: "Lead anonimizada", phone: a, collected: {}, human_reason: null }).eq("phone", phone);
  await db.from("dlbjj_fila_saida").update({ corpo: "[anonimizado]", phone: a }).eq("phone", phone);
  await db.from("dlbjj_toques").update({ phone: a }).eq("phone", phone);
  await db.from("dlbjj_tokens").update({ revogado_em: new Date().toISOString() }).in("lead_id", (await db.from("dlbjj_leads").select("id").eq("phone", a)).data?.map((l) => l.id) ?? []).is("revogado_em", null);
}

/** O cron mensal: 24 meses sem contacto nem presença, e não ativo. */
export async function anonimizarAntigos(meses = 24): Promise<{ alunos: number; leads: number }> {
  const db = serviceClient();
  const limite = somarDias(hojeLisboa(), -Math.round(meses * 30.44));
  const limiteTs = `${limite}T00:00:00Z`;

  const { data: alunos } = await db.from("dlbjj_alunos").select("id,phone").neq("estado", "ativo").neq("estado", "anonimizado");
  let nAlunos = 0;
  for (const a of alunos ?? []) {
    const [{ data: ultimaPres }, { data: ultimaMsg }] = await Promise.all([
      db.from("dlbjj_presencas").select("data").eq("aluno_id", a.id).order("data", { ascending: false }).limit(1).maybeSingle(),
      db.from("dlbjj_mensagens").select("created_at").eq("phone", a.phone).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const ultimo = [ultimaPres?.data ? `${ultimaPres.data}T00:00:00Z` : null, ultimaMsg?.created_at ?? null].filter(Boolean).sort().at(-1) ?? null;
    if (!ultimo || ultimo < limiteTs) {
      await anonimizarAluno(a.id);
      nAlunos += 1;
    }
  }

  const { data: leads } = await db.from("dlbjj_leads").select("id").is("aluno_id", null).lt("last_message_at", limiteTs).not("phone", "like", "anon:%");
  let nLeads = 0;
  for (const l of leads ?? []) {
    await anonimizarLead(l.id);
    nLeads += 1;
  }
  return { alunos: nAlunos, leads: nLeads };
}
