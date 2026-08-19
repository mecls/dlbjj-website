/* eslint-disable @typescript-eslint/no-unused-vars -- transporte no-op: parâmetros existem só para cumprir a interface */
import "server-only";
import type { MessagingProvider, OutboundOption } from "./provider";

/**
 * Transporte de demo/dev. Não chama nenhuma API externa — as mensagens de saída
 * são gravadas na tabela dlbjj_mensagens pelo motor e mostradas no painel. Deixa
 * correr todo o fluxo de onboarding antes de haver aprovação da Meta ou números
 * reais.
 */
export const simulatorProvider: MessagingProvider = {
  name: "simulator",
  async sendText(_to: string, _body: string) {
    return null; // a linha na BD É a "entrega" no simulador
  },
  async sendButtons(_to: string, _body: string, _options: OutboundOption[]) {
    return null;
  },
  async sendList(
    _to: string,
    _body: string,
    _buttonLabel: string,
    _options: OutboundOption[],
  ) {
    return null;
  },
};
