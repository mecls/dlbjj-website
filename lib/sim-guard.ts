import "server-only";
import type { NextRequest } from "next/server";
import crypto from "node:crypto";
import { APP, isProduction } from "@/lib/config";

/**
 * Quem pode injetar mensagens no motor pelo simulador.
 *
 * As rotas /api/sim/* metem mensagens no MESMO motor que o worker usa. Com o
 * WhatsApp ligado, uma rota aberta enche a fila de saída de mensagens para o
 * número que quem chama escolher, e o painel de leads falsas.
 *
 * Regra:
 *  - `x-sim-secret` igual a CRON_SECRET → permitido (também em produção).
 *  - Senão → só fora de produção.
 */
export function simAllowed(req: NextRequest): boolean {
  const secret = APP.cronSecret();
  const dado = req.headers.get("x-sim-secret") ?? "";
  if (secret && dado.length === secret.length && crypto.timingSafeEqual(Buffer.from(dado), Buffer.from(secret))) {
    return true;
  }
  return !isProduction();
}
