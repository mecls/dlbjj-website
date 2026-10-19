import { dentroDaJanela, proximaAbertura } from "../tempo";

/**
 * As portas que uma linha da fila tem de passar NO MOMENTO DE SAIR (spec §6.2,
 * §6.3, §6.4, §14). Função pura; quem a chama carrega o contexto da BD.
 *
 *  humano    — a mensagem do Daniel pelo painel: sai sempre.
 *  resposta  — resposta a quem escreveu: sai a qualquer hora, não conta para o teto.
 *  sistema   — confirmações (inscrição): como resposta.
 *  proativa  — reativação: só com bot ligado, sem opt-out, dentro da janela,
 *              abaixo do teto do dia e sem restrição do WhatsApp em curso.
 */
export type Kind = "resposta" | "sistema" | "proativa" | "humano";

export interface LinhaFila {
  id: string;
  kind: Kind;
  phone: string;
  tentativas: number;
}

export interface Contexto {
  agora: Date;
  botLigado: boolean;
  optOut: boolean;
  janela: { inicio: string; fim: string };
  proativasHoje: number;
  tecto: number;
  restricaoAte: Date | null;
}

export type Decisao =
  | { acao: "enviar" }
  | { acao: "cancelar"; motivo: string }
  | { acao: "adiar"; ate: Date; motivo: string };

export function decidir(linha: LinhaFila, ctx: Contexto): Decisao {
  if (linha.kind === "humano") return { acao: "enviar" };
  if (!ctx.botLigado) return { acao: "cancelar", motivo: "interruptor desligado" };
  if (linha.kind !== "proativa") return { acao: "enviar" };

  if (ctx.optOut) return { acao: "cancelar", motivo: "opt-out" };
  if (ctx.restricaoAte && ctx.restricaoAte.getTime() > ctx.agora.getTime()) {
    return { acao: "adiar", ate: ctx.restricaoAte, motivo: "restrição do WhatsApp" };
  }
  if (!dentroDaJanela(ctx.janela.inicio, ctx.janela.fim, ctx.agora)) {
    return { acao: "adiar", ate: proximaAbertura(ctx.janela.inicio, ctx.agora), motivo: "fora da janela" };
  }
  if (ctx.proativasHoje >= ctx.tecto) {
    // O teto é de hoje; amanhã às `inicio` conta de novo.
    const amanha = new Date(ctx.agora.getTime() + 24 * 60 * 60 * 1000);
    return { acao: "adiar", ate: proximaAbertura(ctx.janela.inicio, new Date(amanha.getTime() - 24 * 60 * 60 * 1000 + 1)), motivo: "teto diário" };
  }
  return { acao: "enviar" };
}
