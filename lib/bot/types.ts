/**
 * Tipos do agente de onboarding. Uma "lead" é uma pessoa que escreveu no
 * WhatsApp da academia — é ao mesmo tempo a ficha de cliente e o estado da
 * conversa.
 */

/** Para quem é a inscrição. */
export type Publico = "kids" | "adulto";

/** Modalidades oferecidas pelo bot (defesa-pessoal-feminina fica de fora — sem horário). */
export type Modalidade = "jiu-jitsu" | "nogi" | "mma";

/**
 * Passo atual da máquina de estados (o que estamos à espera de receber).
 *  inicio → nome → publico → [modalidade] → [local] → horario → origem → confirmacao → concluido
 * (modalidade é saltado para kids; local é saltado quando só há um espaço compatível)
 */
export type Step =
  | "inicio"
  | "nome"
  | "publico"
  | "modalidade"
  | "local"
  | "horario"
  | "origem"
  | "confirmacao"
  | "concluido";

export type LeadStatus =
  | "novo"
  | "em_progresso"
  | "concluido"
  | "humano"
  | "descartado";

export type Lead = {
  id: string;
  phone: string;
  name: string | null;
  publico: Publico | null;
  modalidade: Modalidade | null;
  local_slug: string | null;
  turma: string | null;
  dias: string | null;
  horario: string | null;
  origem: string | null;
  step: Step;
  collected: Record<string, unknown>;
  status: LeadStatus;
  paused: boolean;
  human_reason: string | null;
  first_contact_at: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
};

export type MessageDirection = "in" | "out";
export type MessageRole = "lead" | "bot" | "humano";

export type LeadMessage = {
  id: string;
  lead_id: string | null;
  phone: string;
  direction: MessageDirection;
  role: MessageRole;
  body: string;
  media_url: string | null;
  wa_message_id: string | null;
  created_at: string;
};

export const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  em_progresso: "Em progresso",
  concluido: "Concluído",
  humano: "Com humano",
  descartado: "Descartado",
};

export const STEP_LABEL: Record<Step, string> = {
  inicio: "Início",
  nome: "Nome",
  publico: "Para quem",
  modalidade: "Modalidade",
  local: "Espaço",
  horario: "Horário",
  origem: "Como conheceu",
  confirmacao: "Confirmação",
  concluido: "Concluído",
};
