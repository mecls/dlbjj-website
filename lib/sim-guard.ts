import "server-only";
import type { NextRequest } from "next/server";
import { hasWhatsApp, isProduction } from "@/lib/config";

/**
 * Quem pode injetar mensagens no motor pelo simulador.
 *
 * As rotas /api/sim/* metem mensagens no MESMO motor que o webhook real usa. Não
 * são inofensivas assim que o WhatsApp estiver ligado: `handleInbound` acaba em
 * `sendOutbound`, que usa o transporte real — ou seja, uma rota aberta manda
 * mensagens a partir do número da academia, para o número que quem chama
 * escolher, e enche o painel de leads falsas.
 *
 * Regra:
 *  - CRON_SECRET definido → é preciso o cabeçalho `x-sim-secret` a bater.
 *  - Sem segredo → só em desenvolvimento E só enquanto o WhatsApp real não
 *    estiver configurado. É este o caso da Fase 3 (provar o loop no simulador),
 *    que assim continua a funcionar sem fricção nenhuma.
 */
export function simAllowed(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.get("x-sim-secret") === secret;
  return !isProduction() && !hasWhatsApp();
}
