import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import { localPorSlug } from "@/content/site";
import { alunosDoTelefone, primeiroNome, turmasAtivas, type AlunoPublico } from "@/lib/alunos/consultas";
import { diaSemanaLisboa, hojeLisboa, NOME_DIA } from "@/lib/tempo";
import { hhmm, proximaAula, resolverAulasDoDia, type TurmaRow } from "./checkin";
import { dizer } from "./dizer";
import type { OutboundOption } from "./options";
import { pauseForHuman, updateLead } from "./state";
import type { Lead } from "./types";

/**
 * O diálogo do check-in (spec §3 C/C′). O estado entre perguntas vive em
 * `lead.collected.checkin` e expira em 60 minutos.
 */
interface EstadoCheckin {
  fase: "quem" | "aula";
  alunos: string[]; // ids: candidatos (fase quem) ou escolhidos (fase aula)
  turmas?: string[]; // ids das aulas candidatas (fase aula)
  criado: string;
}

const VALIDADE_MS = 60 * 60 * 1000;

function estadoDe(lead: Lead): EstadoCheckin | null {
  const e = (lead.collected as { checkin?: EstadoCheckin } | null)?.checkin;
  if (!e) return null;
  if (Date.now() - new Date(e.criado).getTime() > VALIDADE_MS) return null;
  return e;
}

async function guardarEstado(lead: Lead, estado: EstadoCheckin | null): Promise<Lead> {
  return updateLead(lead.id, { collected: { ...(lead.collected ?? {}), checkin: estado } });
}

function nomeLocal(slug: string | null): string {
  return (slug && localPorSlug(slug)?.nome) || "a academia";
}

export async function iniciarCheckin(lead: Lead, agora: Date): Promise<void> {
  const alunos = await alunosDoTelefone(lead.phone);
  if (alunos.length === 0) {
    await dizer(lead, "Ainda não tens inscrição concluída. Vou avisar o Daniel para te enviar o formulário. 🙏");
    await pauseForHuman(lead.id, "pediu check-in sem inscrição");
    return;
  }
  if (alunos.length > 1) {
    const opcoes: OutboundOption[] = alunos.map((a) => ({ id: a.id, title: a.nome }));
    opcoes.push({ id: "todos", title: alunos.length === 2 ? "Os dois" : "Todos" });
    await guardarEstado(lead, { fase: "quem", alunos: alunos.map((a) => a.id), criado: agora.toISOString() });
    await dizer(lead, "Para quem é a presença?", opcoes);
    return;
  }
  await escolherAula(lead, alunos, agora);
}

/** Um dígito a responder a "para quem?" / "que aula?". Devolve true se tratou. */
export async function continuarCheckin(lead: Lead, texto: string, agora: Date): Promise<boolean> {
  const estado = estadoDe(lead);
  if (!estado) return false;
  if (!/^\d$/.test(texto.trim())) {
    await guardarEstado(lead, null);
    return false;
  }
  const idx = Number(texto.trim()) - 1;
  const todos = await alunosDoTelefone(lead.phone);

  if (estado.fase === "quem") {
    const candidatos = estado.alunos.map((id) => todos.find((a) => a.id === id)).filter(Boolean) as AlunoPublico[];
    let escolhidos: AlunoPublico[];
    if (idx === candidatos.length) escolhidos = candidatos;
    else if (candidatos[idx]) escolhidos = [candidatos[idx]];
    else {
      await dizer(lead, "Não percebi. Responde com o número.");
      return true;
    }
    const fresh = await guardarEstado(lead, null);
    await escolherAula(fresh, escolhidos, agora);
    return true;
  }

  // fase aula
  const turmas = await turmasAtivas();
  const candidatas = (estado.turmas ?? []).map((id) => turmas.find((t) => t.id === id)).filter(Boolean) as TurmaRow[];
  const turma = candidatas[idx];
  if (!turma) {
    await dizer(lead, "Não percebi. Responde com o número da aula.");
    return true;
  }
  const escolhidos = estado.alunos.map((id) => todos.find((a) => a.id === id)).filter(Boolean) as AlunoPublico[];
  const fresh = await guardarEstado(lead, null);
  await registarPresenca(fresh, escolhidos, turma, agora);
  return true;
}

async function escolherAula(lead: Lead, alunos: AlunoPublico[], agora: Date): Promise<void> {
  const turmas = await turmasAtivas();
  const ref = alunos[0];
  const { candidatas } = resolverAulasDoDia(ref, turmas, agora);

  if (candidatas.length === 0) {
    const prox = proximaAula(ref, turmas, agora);
    const local = nomeLocal(ref.local_slug);
    await dizer(
      lead,
      prox
        ? `Hoje não há aulas em ${local}. A próxima é ${prox.diaNome} às ${prox.horario} (${prox.turma}).`
        : `Hoje não há aulas em ${local}.`,
    );
    return;
  }
  if (candidatas.length === 1) {
    await registarPresenca(lead, alunos, candidatas[0], agora);
    return;
  }
  await guardarEstado(lead, {
    fase: "aula",
    alunos: alunos.map((a) => a.id),
    turmas: candidatas.map((t) => t.id),
    criado: agora.toISOString(),
  });
  await dizer(
    lead,
    "Que aula?",
    candidatas.map((t) => ({ id: t.id, title: `${hhmm(t.horario)} · ${t.turma}` })),
  );
}

/** Regista a presença de hoje (silencioso = sem resposta, para o bot desligado). */
export async function registarPresenca(
  lead: Lead,
  alunos: AlunoPublico[],
  turma: TurmaRow,
  agora: Date,
  silencioso = false,
): Promise<void> {
  const db = serviceClient();
  const dia = hojeLisboa(agora);
  const registados: AlunoPublico[] = [];
  for (const a of alunos) {
    const { error } = await db
      .from("dlbjj_presencas")
      .insert({ aluno_id: a.id, turma_id: turma.id, data: dia, origem: "whatsapp" });
    if (!error) registados.push(a);
    else if (error.code !== "23505") console.error("[checkin] presença não gravada", error);
  }
  if (registados.length > 0) {
    const inativos = registados.filter((a) => a.estado === "inativo").map((a) => a.id);
    if (inativos.length) await db.from("dlbjj_alunos").update({ estado: "ativo" }).in("id", inativos);
  }
  if (silencioso) return;

  if (registados.length === 0) {
    await dizer(lead, alunos.length > 1 ? "Já tinham a presença registada hoje. 🙂" : "Já tinhas a presença registada hoje. 🙂");
    return;
  }
  const quando = `${NOME_DIA[diaSemanaLisboa(agora)]} ${hhmm(turma.horario)}`;
  const local = nomeLocal(turma.local_slug);
  if (registados.length === 1) {
    await dizer(lead, `Presença registada: ${turma.turma} · ${quando} · ${local}. Bom treino, ${primeiroNome(registados[0].nome)}! 🥋`);
  } else {
    const nomes = registados.map((a) => primeiroNome(a.nome)).join(" e ");
    await dizer(lead, `Presença registada para ${nomes}: ${turma.turma} · ${quando} · ${local}. Bom treino! 🥋`);
  }
}

/** Bot desligado: regista sem perguntar nada, só quando há uma única aula possível. */
export async function checkinSilencioso(lead: Lead, agora: Date): Promise<void> {
  const alunos = await alunosDoTelefone(lead.phone);
  if (alunos.length !== 1) return;
  const { candidatas } = resolverAulasDoDia(alunos[0], await turmasAtivas(), agora);
  if (candidatas.length !== 1) return;
  await registarPresenca(lead, alunos, candidatas[0], agora, true);
}
