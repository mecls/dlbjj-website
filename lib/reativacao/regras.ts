import { createHash } from "node:crypto";

/**
 * As regras de reativação (spec §5.1), puras: recebem leads, alunos e toques
 * já carregados e devolvem o que fazer. Nada aqui toca na base de dados nem
 * no relógio — `agora` vem de fora, para os testes o fixarem.
 *
 *  R1  lead a meio, 24 h sem escrever, sem R1          → toque
 *  R2  idem, 72 h, com R1 e sem R2                      → toque
 *  —   idem, 7 dias, com R2                             → lead perdida (sem mensagem)
 *  R3  lead concluída sem inscrição há 10 dias, sem R3  → toque
 *  R4  aluno ativo sem presença há 14 dias, sem R4 nos últimos 30 → toque
 *  R5  aluno ativo sem presença há 30 dias, R4 há ≥ 14 dias, sem R5 nos últimos 90 → toque + inativo
 *
 * Um toque saltado no painel conta como feito. Opt-outs e números anonimizados
 * nunca recebem nada.
 */
export type Regra = "R1" | "R2" | "R3" | "R4" | "R5";

export interface LeadR {
  id: string;
  phone: string;
  name: string | null;
  status: string;
  step: string;
  paused: boolean;
  aluno_id: string | null;
  last_message_at: string;
  updated_at: string;
}

export interface AlunoR {
  id: string;
  nome: string;
  phone: string;
  estado: string;
  inicio_em: string | null;
  turma: { turma: string; dias: string; horario: string } | null;
  ultimaPresenca: string | null; // YYYY-MM-DD
}

export interface ToqueR {
  phone: string;
  regra: string;
  estado: string;
  created_at: string;
  enviada_em: string | null;
}

export interface Contexto {
  agora: Date;
  leads: LeadR[];
  alunos: AlunoR[];
  toques: ToqueR[];
  optOuts: Set<string>; // sha256 hex dos telefones
  /** Escolhe uma variante de texto; por omissão ao acaso (uniforme). */
  escolher?: (variantes: string[]) => string;
}

export type Acao =
  | { tipo: "toque"; regra: Regra; phone: string; leadId: string | null; alunoId: string | null; nome: string; corpo: string }
  | { tipo: "perdido"; leadId: string }
  | { tipo: "inativo"; alunoId: string };

const HORA = 3_600_000;
const DIA = 24 * HORA;

const primeiroNome = (n: string | null | undefined) => (n ?? "").trim().split(/\s+/)[0] || "";
const ola = (n: string) => (n ? `Olá ${n}!` : "Olá!");
const olaVirgula = (n: string) => (n ? `Olá ${n},` : "Olá,");

interface Extra {
  turma: string;
  dias: string;
  horario: string;
}

export const TEXTOS: Record<Regra, ((n: string, x: Extra) => string)[]> = {
  R1: [
    (n) => `${ola(n)} Ficou a faltar pouco para marcares a tua aula grátis na DL-BJJ. Queres continuar? Responde *sim* e retomamos onde ficámos. 🥋`,
    (n) => `${olaVirgula(n)} por aqui é a DL-BJJ. 🙂 A tua aula grátis ficou a meio de marcar — se quiseres continuar, responde *sim* e retomamos.`,
  ],
  R2: [
    (n) => `${olaVirgula(n)} só para não ficar esquecido: a primeira aula é grátis e sem compromisso. Diz-me *sim* e marco já. Se preferires que não insista, diz *parar*.`,
    (n) => `${n ? `${n}, ú` : "Ú"}ltima nota da DL-BJJ: a primeira aula é grátis e sem compromisso. Responde *sim* e marco já — ou *parar* e não volto a escrever.`,
  ],
  R3: [
    (n) => `${ola(n)} Correu bem a tua ida à DL-BJJ? Se ainda não deu para ir, diz-me um dia que te dê jeito e marcamos de novo. 🙂`,
    (n) => `${olaVirgula(n)} aqui a DL-BJJ. Chegaste a vir à aula experimental? Se não deu, diz-me um dia que te dê jeito e marcamos outra vez. 🙂`,
  ],
  R4: [
    (n, x) => `${ola(n)} Há umas semanas que não te vemos no tatame. Está tudo bem? As aulas de ${x.turma} continuam ${x.dias} às ${x.horario}. Oss 🥋`,
    (n, x) => `${olaVirgula(n)} por aqui sentimos a tua falta no tatame. 🙂 Está tudo bem? As aulas de ${x.turma} continuam ${x.dias} às ${x.horario}. Oss 🥋`,
  ],
  R5: [
    (n) => `${olaVirgula(n)} o tatame sente a tua falta. 🙂 Se quiseres voltar, basta apareceres — ou diz-me se preferires que não insista.`,
    (n) => `${n ? `${n}, a` : "A"}qui a DL-BJJ: o tatame sente a tua falta. Quando quiseres voltar, basta apareceres. Se preferires que não insista, diz *parar*.`,
  ],
};

export function hashTelefone(phone: string): string {
  return createHash("sha256").update(phone).digest("hex");
}

function diaParaMs(dia: string): number {
  const [y, m, d] = dia.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function avaliarRegras(ctx: Contexto): Acao[] {
  const agora = ctx.agora.getTime();
  const escolher = ctx.escolher ?? ((v) => v[Math.floor(Math.random() * v.length)]);
  const acoes: Acao[] = [];

  const toquesDe = (phone: string, regra: Regra) => ctx.toques.filter((t) => t.phone === phone && t.regra === regra);
  const tocado = (phone: string, regra: Regra, dentroDeMs?: number) =>
    toquesDe(phone, regra).some((t) => dentroDeMs === undefined || agora - new Date(t.created_at).getTime() < dentroDeMs);
  const permitido = (phone: string) => !phone.startsWith("anon:") && !ctx.optOuts.has(hashTelefone(phone));
  const texto = (regra: Regra, nome: string, extra?: Extra) =>
    escolher(TEXTOS[regra].map((f) => f(primeiroNome(nome), extra ?? { turma: "", dias: "", horario: "" })));

  for (const l of ctx.leads) {
    if (!permitido(l.phone) || l.paused || l.aluno_id) continue;
    const idade = agora - new Date(l.last_message_at).getTime();

    if (l.status === "novo" || l.status === "em_progresso") {
      if (idade >= 7 * DIA && tocado(l.phone, "R2")) {
        acoes.push({ tipo: "perdido", leadId: l.id });
        continue;
      }
      if (idade >= 72 * HORA && tocado(l.phone, "R1") && !tocado(l.phone, "R2")) {
        acoes.push({ tipo: "toque", regra: "R2", phone: l.phone, leadId: l.id, alunoId: null, nome: l.name ?? "", corpo: texto("R2", l.name ?? "") });
        continue;
      }
      if (idade >= 24 * HORA && !tocado(l.phone, "R1")) {
        acoes.push({ tipo: "toque", regra: "R1", phone: l.phone, leadId: l.id, alunoId: null, nome: l.name ?? "", corpo: texto("R1", l.name ?? "") });
      }
      continue;
    }

    if (l.status === "concluido") {
      const desde = agora - new Date(l.updated_at).getTime();
      if (desde >= 10 * DIA && !tocado(l.phone, "R3")) {
        acoes.push({ tipo: "toque", regra: "R3", phone: l.phone, leadId: l.id, alunoId: null, nome: l.name ?? "", corpo: texto("R3", l.name ?? "") });
      }
    }
  }

  for (const a of ctx.alunos) {
    if (a.estado !== "ativo" || !permitido(a.phone)) continue;
    const refs = [a.ultimaPresenca, a.inicio_em].filter((x): x is string => Boolean(x)).map(diaParaMs);
    if (refs.length === 0) continue;
    const ausente = agora - Math.max(...refs);
    const extra: Extra = a.turma ?? { turma: "Jiu-Jitsu", dias: "", horario: "" };

    const r4Antigo = toquesDe(a.phone, "R4").some((t) => agora - new Date(t.created_at).getTime() >= 14 * DIA);
    if (ausente >= 30 * DIA && r4Antigo && !tocado(a.phone, "R5", 90 * DIA)) {
      acoes.push({ tipo: "toque", regra: "R5", phone: a.phone, leadId: null, alunoId: a.id, nome: a.nome, corpo: texto("R5", a.nome, extra) });
      acoes.push({ tipo: "inativo", alunoId: a.id });
      continue;
    }
    if (ausente >= 14 * DIA && !tocado(a.phone, "R4", 30 * DIA)) {
      acoes.push({ tipo: "toque", regra: "R4", phone: a.phone, leadId: null, alunoId: a.id, nome: a.nome, corpo: texto("R4", a.nome, extra) });
    }
  }

  return acoes;
}
