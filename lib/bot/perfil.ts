import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import { APP } from "@/lib/config";
import { alunosDoTelefone, primeiroNome, type AlunoPublico } from "@/lib/alunos/consultas";
import { hojeLisboa, instanteLisboa } from "@/lib/tempo";
import { emitirToken } from "@/lib/tokens-db";
import { dizer } from "./dizer";
import { updateLead } from "./state";
import type { Lead } from "./types";

/** Link da ficha (spec §3 F): no máximo 3 por aluno por dia. */
const MAX_POR_DIA = 3;

interface EstadoPerfil {
  alunos: string[];
  criado: string;
}

function estadoDe(lead: Lead): EstadoPerfil | null {
  const e = (lead.collected as { perfil?: EstadoPerfil } | null)?.perfil;
  if (!e) return null;
  if (Date.now() - new Date(e.criado).getTime() > 60 * 60 * 1000) return null;
  return e;
}

async function guardarEstado(lead: Lead, estado: EstadoPerfil | null): Promise<Lead> {
  return updateLead(lead.id, { collected: { ...(lead.collected ?? {}), perfil: estado } });
}

export async function pedirPerfil(lead: Lead): Promise<void> {
  const alunos = await alunosDoTelefone(lead.phone);
  if (alunos.length === 0) {
    await dizer(lead, "Ainda não tens ficha de aluno. Pede ao Daniel para te enviar a inscrição. 🙂");
    return;
  }
  if (alunos.length > 1) {
    await guardarEstado(lead, { alunos: alunos.map((a) => a.id), criado: new Date().toISOString() });
    await dizer(lead, "De quem é a ficha?", alunos.map((a) => ({ id: a.id, title: a.nome })));
    return;
  }
  await enviarLink(lead, alunos[0]);
}

export async function continuarPerfil(lead: Lead, texto: string): Promise<boolean> {
  const estado = estadoDe(lead);
  if (!estado) return false;
  if (!/^\d$/.test(texto.trim())) {
    await guardarEstado(lead, null);
    return false;
  }
  const todos = await alunosDoTelefone(lead.phone);
  const aluno = todos.find((a) => a.id === estado.alunos[Number(texto.trim()) - 1]);
  if (!aluno) {
    await dizer(lead, "Não percebi. Responde com o número.");
    return true;
  }
  const fresh = await guardarEstado(lead, null);
  await enviarLink(fresh, aluno);
  return true;
}

async function enviarLink(lead: Lead, aluno: AlunoPublico): Promise<void> {
  const db = serviceClient();
  const inicioDoDia = instanteLisboa(hojeLisboa(), "00:00").toISOString();
  const { count } = await db
    .from("dlbjj_tokens")
    .select("token_hash", { count: "exact", head: true })
    .eq("kind", "perfil")
    .eq("aluno_id", aluno.id)
    .gte("created_at", inicioDoDia);
  if ((count ?? 0) >= MAX_POR_DIA) {
    await dizer(lead, "Já te enviei o link hoje — usa o anterior. 🙂");
    return;
  }
  const token = await emitirToken("perfil", { alunoId: aluno.id });
  await dizer(lead, `Aqui tens a tua ficha, ${primeiroNome(aluno.nome)}: ${APP.baseUrl()}/aluno/${token} (válido 7 dias)`);
}
