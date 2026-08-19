import type { OutboundOption } from "@/lib/messaging/provider";
import type { Lead, Modalidade, Publico, Step } from "./types";
import { aulasPara, locaisPara, localPorSlug } from "./schedule";

/**
 * O "guião" da conversa: perguntas (pt-PT) e opções de cada passo. Todas as
 * opções de local/horário vêm das aulas reais (ver schedule.ts). As restantes
 * são fixas. Os ids são estáveis para o motor os reconhecer nas respostas.
 */

export const MODALIDADE_LABEL: Record<Modalidade, string> = {
  "jiu-jitsu": "Jiu-Jitsu",
  nogi: "NoGi",
  mma: "MMA",
};

export const ORIGEM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  google: "Google",
  recomendacao: "Recomendação",
  porta: "Passei à porta",
  outro: "Outro",
};

// ─────────────────────────────── Opções ───────────────────────────────

export function publicoOptions(): OutboundOption[] {
  return [
    { id: "pub:adulto", title: "Para mim" },
    { id: "pub:kids", title: "Para o/a filho/a" },
  ];
}

export function modalidadeOptions(): OutboundOption[] {
  return [
    { id: "mod:jiu-jitsu", title: "Jiu-Jitsu" },
    { id: "mod:nogi", title: "NoGi" },
    { id: "mod:mma", title: "MMA" },
  ];
}

export function localOptions(
  publico: Publico,
  modalidade: Modalidade,
): OutboundOption[] {
  return locaisPara(publico, modalidade).map((l) => ({
    id: `loc:${l.slug}`,
    title: l.nome,
    description: l.morada ?? undefined,
  }));
}

/** Índice = posição em aulasPara(...) — estável entre a pergunta e a resposta. */
export function horarioOptions(
  publico: Publico,
  modalidade: Modalidade,
  localSlug: string,
): OutboundOption[] {
  return aulasPara(publico, modalidade, localSlug).map((a, i) => ({
    id: `hor:${i}`,
    title: `${a.horario} · ${a.turma}`,
    description: a.dias,
  }));
}

export function origemOptions(): OutboundOption[] {
  return [
    { id: "org:instagram", title: "Instagram" },
    { id: "org:google", title: "Google" },
    { id: "org:recomendacao", title: "Recomendação" },
    { id: "org:porta", title: "Passei à porta" },
    { id: "org:outro", title: "Outro" },
  ];
}

export function confirmOptions(): OutboundOption[] {
  return [
    { id: "cfm:sim", title: "Sim, confirmo" },
    { id: "cfm:corrigir", title: "Corrigir" },
  ];
}

// ─────────────────────────────── Textos ───────────────────────────────

export function greetingText(): string {
  return (
    "Olá! 👋 Bem-vindo/a à Academia DL-BJJ. Sou o assistente de inscrições e em " +
    "1 minuto ajudo-te a marcar a tua *primeira aula grátis*.\n\nComo te chamas?"
  );
}

function primeiroNome(name: string | null): string {
  return (name ?? "").trim().split(/\s+/)[0] || "";
}

export function publicoQuestion(name: string | null): string {
  const n = primeiroNome(name);
  const ola = n ? `Prazer, ${n}! 🙌 ` : "";
  return `${ola}A inscrição é para ti ou para um/a filho/a?`;
}

export function modalidadeQuestion(): string {
  return "Que modalidade te interessa mais?";
}

export function localQuestion(): string {
  return "Em que espaço preferes treinar?";
}

export function horarioQuestion(): string {
  return "Boa! Estes são os horários disponíveis. Qual te dá mais jeito?";
}

export function origemQuestion(): string {
  return "Só mais uma coisa: como é que nos conheceste?";
}

export function summaryText(lead: Lead): string {
  const local = lead.local_slug ? localPorSlug(lead.local_slug) : undefined;
  const modalidade = lead.modalidade ? MODALIDADE_LABEL[lead.modalidade] : "—";
  const para =
    lead.publico === "kids" ? "o/a teu/tua filho/a" : "ti";
  const origem = lead.origem ? (ORIGEM_LABEL[lead.origem] ?? lead.origem) : "—";
  const linhas = [
    "Deixa-me confirmar 🥋",
    "",
    `• *Nome:* ${lead.name ?? "—"}`,
    `• *Para:* ${para}`,
    `• *Modalidade:* ${modalidade}`,
    `• *Espaço:* ${local?.nome ?? "—"}${local?.morada ? ` (${local.morada})` : ""}`,
    `• *Aula:* ${lead.turma ?? "—"} · ${lead.dias ?? ""} · ${lead.horario ?? ""}`,
    `• *Como nos conheceste:* ${origem}`,
    "",
    "Está tudo certo?",
  ];
  return linhas.join("\n");
}

export function confirmedText(name: string | null): string {
  const n = primeiroNome(name);
  const ola = n ? `Perfeito, ${n}! 🙌` : "Perfeito! 🙌";
  return (
    `${ola} Ficámos com os teus dados. O Daniel (ou a nossa equipa) vai falar ` +
    "contigo em breve para marcar a tua primeira aula grátis.\n\nAté já! Oss 🥋"
  );
}

// ─────────────────── Prompt do passo atual (fonte única) ───────────────────

export interface StepPrompt {
  text: string;
  options: OutboundOption[]; // vazio → resposta em texto livre
  /** Rótulo do botão da lista, quando há >3 opções. */
  listLabel?: string;
}

/**
 * O que o bot pergunta no passo atual da lead. Fonte única usada tanto para
 * avançar como para repetir a pergunta quando a resposta não é percebida.
 */
export function promptFor(lead: Lead): StepPrompt {
  switch (lead.step) {
    case "nome":
      return { text: greetingText(), options: [] };
    case "publico":
      return { text: publicoQuestion(lead.name), options: publicoOptions() };
    case "modalidade":
      return { text: modalidadeQuestion(), options: modalidadeOptions() };
    case "local":
      return {
        text: localQuestion(),
        options:
          lead.publico && lead.modalidade
            ? localOptions(lead.publico, lead.modalidade)
            : [],
        listLabel: "Escolher espaço",
      };
    case "horario":
      return {
        text: horarioQuestion(),
        options:
          lead.publico && lead.modalidade && lead.local_slug
            ? horarioOptions(lead.publico, lead.modalidade, lead.local_slug)
            : [],
        listLabel: "Ver horários",
      };
    case "origem":
      return {
        text: origemQuestion(),
        options: origemOptions(),
        listLabel: "Escolher",
      };
    case "confirmacao":
      return { text: summaryText(lead), options: confirmOptions() };
    default:
      return { text: greetingText(), options: [] };
  }
}

/** Descrição curta do passo, para dar contexto ao LLM na interpretação. */
export function describeStep(step: Step): string {
  const map: Record<Step, string> = {
    inicio: "início da conversa",
    nome: "estamos a perguntar o nome da pessoa",
    publico: "estamos a perguntar se a inscrição é para adulto (a própria pessoa) ou para um/a filho/a (kids)",
    modalidade: "estamos a perguntar a modalidade (Jiu-Jitsu, NoGi ou MMA)",
    local: "estamos a perguntar em que espaço quer treinar",
    horario: "estamos a perguntar qual o horário/turma que prefere",
    origem: "estamos a perguntar como conheceu a academia",
    confirmacao: "estamos a pedir para confirmar o resumo da inscrição",
    concluido: "a inscrição já foi concluída",
  };
  return map[step];
}
