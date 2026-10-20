import type { TurmaRow } from "@/lib/bot/checkin";
import type { Graduacao } from "@/lib/alunos/faixas";
import { diaMes } from "@/lib/datas-pt";
import { diaSemanaDe, horaLisboa, somarDias } from "@/lib/tempo";

/**
 * As contas da área do aluno (design §5.6). Tudo puro: recebe presenças,
 * turmas e "hoje" (YYYY-MM-DD em Lisboa) e nunca toca na base de dados.
 */
export interface PresencaDia {
  data: string;
}

export function aulasNoMes(presencas: PresencaDia[], hoje: string): number {
  const mes = hoje.slice(0, 7);
  return presencas.filter((p) => p.data.slice(0, 7) === mes).length;
}

export function aulasDesdeInicio(presencas: PresencaDia[]): number {
  return presencas.length;
}

const MAX_DIAS = 366;

/**
 * Dias seguidos com check-in, a andar para trás a partir de hoje. Hoje sem
 * check-in não quebra (o dia não acabou) e não conta. Um dia sem check-in em
 * que nenhuma das turmas do aluno corre é saltado; um dia com aula e sem
 * check-in pára a contagem. Sem turmas, nenhum dia é saltado.
 */
export function diasSeguidos(presencas: PresencaDia[], diasComAula: number[], hoje: string): number {
  const dias = new Set(presencas.map((p) => p.data));
  let n = dias.has(hoje) ? 1 : 0;
  for (let i = 1; i <= MAX_DIAS; i++) {
    if (n >= MAX_DIAS) break;
    const dia = somarDias(hoje, -i);
    if (dias.has(dia)) {
      n += 1;
      continue;
    }
    if (diasComAula.length > 0 && !diasComAula.includes(diaSemanaDe(dia))) continue;
    break;
  }
  return n;
}

/** Posição densa (empates partilham a posição; a contagem seguinte distinta leva a seguinte). */
export function posicaoNoRanking(contagens: { alunoId: string; n: number }[], alunoId: string): { posicao: number | null; total: number } {
  const eu = contagens.find((c) => c.alunoId === alunoId);
  if (!eu) return { posicao: null, total: contagens.length };
  const distintas = [...new Set(contagens.map((c) => c.n))].sort((a, b) => b - a);
  return { posicao: distintas.indexOf(eu.n) + 1, total: contagens.length };
}

export interface LinhaRankingAluno {
  alunoId: string;
  nome: string;
  faixa: Graduacao | null;
  n: number;
}

/** Primeiro nome; quando outro partilha o primeiro nome, junta a inicial do apelido. */
export function nomesCurtos(nomes: string[]): string[] {
  const primeiros = nomes.map((n) => n.trim().split(/\s+/));
  const contagem = new Map<string, number>();
  for (const p of primeiros) contagem.set(p[0], (contagem.get(p[0]) ?? 0) + 1);
  return primeiros.map((p) => ((contagem.get(p[0]) ?? 0) > 1 && p[1] ? `${p[0]} ${p[1][0]}.` : p[0]));
}

export function ordenarRanking(linhas: LinhaRankingAluno[]): (LinhaRankingAluno & { posicao: number; nomeCurto: string })[] {
  const ordenadas = [...linhas].sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, "pt"));
  const curtos = nomesCurtos(ordenadas.map((l) => l.nome));
  let posicao = 0;
  let anterior: number | null = null;
  return ordenadas.map((l, i) => {
    if (l.n !== anterior) {
      posicao += 1;
      anterior = l.n;
    }
    return { ...l, posicao, nomeCurto: curtos[i] };
  });
}

export interface CelulaCalor {
  dia: string;
  n: number;
  futuro: boolean;
}

/** `semanas × 7` dias, de segunda a domingo, a acabar no domingo da semana de `hoje`. */
export function mapaDeCalor(presencas: PresencaDia[], hoje: string, semanas: number): CelulaCalor[] {
  const porDia = new Map<string, number>();
  for (const p of presencas) porDia.set(p.data, (porDia.get(p.data) ?? 0) + 1);
  const ultimo = somarDias(hoje, 7 - diaSemanaDe(hoje));
  const primeiro = somarDias(ultimo, -(semanas * 7 - 1));
  const out: CelulaCalor[] = [];
  for (let i = 0; i < semanas * 7; i++) {
    const dia = somarDias(primeiro, i);
    out.push({ dia, n: porDia.get(dia) ?? 0, futuro: dia > hoje });
  }
  return out;
}

export function saudacao(instante: Date): "Bom dia" | "Boa tarde" | "Boa noite" {
  const hora = Number(horaLisboa(instante).slice(0, 2));
  if (hora < 12) return "Bom dia";
  if (hora < 20) return "Boa tarde";
  return "Boa noite";
}

/** A saudação deste instante — fora dos componentes, para o render ficar puro. */
export function saudacaoAgora(): "Bom dia" | "Boa tarde" | "Boa noite" {
  return saudacao(new Date());
}

function diasEntre(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function descreverUltimaAula(data: string, hoje: string): string {
  const n = diasEntre(data, hoje);
  if (n <= 0) return `hoje (${diaMes(data)})`;
  if (n === 1) return `ontem (${diaMes(data)})`;
  if (n <= 7) return `há ${n} dias (${diaMes(data)})`;
  return `em ${diaMes(data)}`;
}

/** Sessões de segunda a domingo: a soma dos dias de cada turma ativa. */
export function aulasDaSemana(turmas: Pick<TurmaRow, "dias_semana" | "ativa">[]): number {
  return turmas.filter((t) => t.ativa).reduce((s, t) => s + t.dias_semana.length, 0);
}

export interface EventoCalendario {
  id: string;
  titulo: string;
  dia: string;
  hora: string | null;
  local_slug: string | null;
  descricao?: string | null;
}

export interface CelulaCalendario {
  dia: string;
  noMes: boolean;
  hoje: boolean;
  aulas: { id: string; horario: string; turma: string }[];
  eventos: EventoCalendario[];
  presente: boolean;
}

export function mesValido(s: string | undefined, hoje: string): string {
  return s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s) ? s : hoje.slice(0, 7);
}

export function mesAnterior(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function mesSeguinte(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** Linhas de 7 dias, da segunda em (ou antes de) dia 1 ao domingo em (ou depois de) o último dia. */
export function mesDeCalendario(mes: string, turmas: TurmaRow[], eventos: EventoCalendario[], presencas: PresencaDia[], hoje: string): CelulaCalendario[][] {
  const primeiroDoMes = `${mes}-01`;
  const ultimoDoMes = somarDias(`${mesSeguinte(mes)}-01`, -1);
  const inicio = somarDias(primeiroDoMes, -(diaSemanaDe(primeiroDoMes) - 1));
  const fim = somarDias(ultimoDoMes, 7 - diaSemanaDe(ultimoDoMes));
  const presentes = new Set(presencas.map((p) => p.data));
  const linhas: CelulaCalendario[][] = [];
  for (let dia = inicio; dia <= fim; dia = somarDias(dia, 7)) {
    const linha: CelulaCalendario[] = [];
    for (let i = 0; i < 7; i++) {
      const d = somarDias(dia, i);
      const ds = diaSemanaDe(d);
      linha.push({
        dia: d,
        noMes: d.slice(0, 7) === mes,
        hoje: d === hoje,
        aulas: turmas
          .filter((t) => t.ativa && t.dias_semana.includes(ds))
          .sort((a, b) => a.horario.localeCompare(b.horario))
          .map((t) => ({ id: t.id, horario: t.horario.slice(0, 5), turma: t.turma })),
        eventos: eventos.filter((e) => e.dia === d),
        presente: presentes.has(d),
      });
    }
    linhas.push(linha);
  }
  return linhas;
}
