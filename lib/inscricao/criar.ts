import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import { primeiroNome } from "@/lib/alunos/consultas";
import { sendOutbound } from "@/lib/bot/outbound";
import { hojeLisboa } from "@/lib/tempo";
import { marcarTokenUsado } from "@/lib/tokens-db";
import type { DadosInscricao } from "./validar";

export const TEXTO_CONFIRMACAO = (nome: string) =>
  `Inscrição recebida, ${primeiroNome(nome)}! Bem-vindo/a à família DL-BJJ. 🥋 Quando vieres treinar, manda-me *presente* e eu registo a tua presença.`;

/**
 * Cria o aluno a partir do formulário (spec §3 B, passo 4): aluno → primeira
 * graduação → token usado → lead ligada e `inscrito` → confirmação na fila
 * (kind sistema). Não há transação pela API REST; a ordem é a que deixa o
 * menor estrago se algo falhar a meio (o aluno existe antes de o token morrer).
 */
async function inserirAluno(dados: DadosInscricao, leadId: string | null, inicioEm: string): Promise<string> {
  const db = serviceClient();
  const { data: aluno, error } = await db
    .from("dlbjj_alunos")
    .insert({
      nome: dados.nome,
      data_nascimento: dados.data_nascimento,
      phone: dados.phone,
      email: dados.email,
      morada: dados.morada,
      nif: dados.nif,
      publico: dados.publico,
      modalidade: dados.modalidade,
      local_slug: dados.local_slug,
      turma_preferida: dados.turma_preferida,
      experiencia_previa: dados.experiencia_previa,
      enc_nome: dados.enc_nome,
      enc_telefone: dados.enc_telefone,
      enc_relacao: dados.enc_relacao,
      contacto_emergencia_nome: dados.contacto_emergencia_nome,
      contacto_emergencia_telefone: dados.contacto_emergencia_telefone,
      condicoes_saude: dados.condicoes_saude,
      consentimento_rgpd_em: new Date().toISOString(),
      consentimento_imagem: dados.consentimento_imagem,
      inicio_em: inicioEm,
      estado: "ativo",
      lead_id: leadId,
    })
    .select("id")
    .single();
  if (error || !aluno) throw new Error(`criarAluno: ${error?.message ?? "sem linha"}`);
  await db.from("dlbjj_graduacoes").insert({ aluno_id: aluno.id, faixa: dados.faixa, graus: dados.graus, atribuida_em: inicioEm, nota: "inscrição" });
  return aluno.id;
}

/** Criação manual no painel: sem token, sem lead, sem mensagem. */
export async function criarAlunoManual(dados: DadosInscricao, inicioEm?: string | null): Promise<string> {
  return inserirAluno(dados, null, inicioEm || hojeLisboa());
}

export async function criarAluno(token: string, leadId: string | null, dados: DadosInscricao): Promise<string> {
  const db = serviceClient();
  const hoje = hojeLisboa();
  const alunoId = await inserirAluno(dados, leadId, hoje);
  const aluno = { id: alunoId };
  await marcarTokenUsado(token);

  if (leadId) {
    const { data: lead } = await db.from("dlbjj_leads").select("name").eq("id", leadId).single();
    await db
      .from("dlbjj_leads")
      .update({ aluno_id: aluno.id, status: "inscrito", step: "concluido", ...(lead?.name ? {} : { name: dados.nome }) })
      .eq("id", leadId);
  }

  await sendOutbound({ leadId, alunoId: aluno.id, to: dados.phone, role: "bot", kind: "sistema", body: TEXTO_CONFIRMACAO(dados.nome) });
  return aluno.id;
}
