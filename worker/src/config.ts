import { hostname } from "node:os";
import { z } from "zod";

/**
 * Toda a leitura de env do worker. Falha no arranque, com a lista do que
 * falta, antes de abrir uma única ligação — um worker meio configurado falha
 * às 23:00 em vez de à frente de quem fez o deploy.
 */
const Schema = z.object({
  SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  APP_BASE_URL: z.string().url(),
  DLBJJ_WORKER_TOKEN: z.string().min(8),
  OPENWA_BASE_URL: z.string().url(),
  OPENWA_API_KEY: z.string().min(1),
  OPENWA_SESSION_ID: z.string().min(1),
  OPENWA_WEBHOOK_SECRET: z.string().min(8),
  WORKER_PORT: z.coerce.number().int().positive().default(4001),
  WORKER_WEBHOOK_PATH: z.string().default("/webhooks/openwa"),
  WORKER_PUBLIC_URL: z.string().url().optional(),
  WORKER_ID: z.string().default(hostname()),
  WORKER_REGISTER_WEBHOOK: z.string().default("true"),
  WORKER_DRAIN_INTERVAL_MS: z.coerce.number().int().positive().default(15_000),
  WORKER_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  WORKER_RETRY_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  WORKER_LEASE_TTL_MS: z.coerce.number().int().positive().default(10 * 60_000),
  WORKER_APP_TIMEOUT_MS: z.coerce.number().int().positive().default(25_000),
  WORKER_HUMANIZE: z.string().default("1"),
});

export interface Config {
  supabaseUrl: string;
  supabaseKey: string;
  appBaseUrl: string;
  workerToken: string;
  openwaBaseUrl: string;
  openwaApiKey: string;
  openwaSessionId: string;
  openwaWebhookSecret: string;
  port: number;
  webhookPath: string;
  publicUrl: string;
  workerId: string;
  registerWebhook: boolean;
  drainIntervalMs: number;
  heartbeatIntervalMs: number;
  retryIntervalMs: number;
  leaseTtlMs: number;
  appTimeoutMs: number;
  humanizar: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = Schema.safeParse(env);
  if (!parsed.success) {
    const faltam = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuração inválida — ${faltam}`);
  }
  const e = parsed.data;
  const supabaseUrl = e.SUPABASE_URL ?? e.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Configuração inválida — SUPABASE_URL em falta");
  return {
    supabaseUrl,
    supabaseKey: e.SUPABASE_SERVICE_ROLE_KEY,
    appBaseUrl: e.APP_BASE_URL,
    workerToken: e.DLBJJ_WORKER_TOKEN,
    openwaBaseUrl: e.OPENWA_BASE_URL,
    openwaApiKey: e.OPENWA_API_KEY,
    openwaSessionId: e.OPENWA_SESSION_ID,
    openwaWebhookSecret: e.OPENWA_WEBHOOK_SECRET,
    port: e.WORKER_PORT,
    webhookPath: e.WORKER_WEBHOOK_PATH,
    publicUrl: (e.WORKER_PUBLIC_URL ?? `http://dlbjj-worker:${e.WORKER_PORT}`).replace(/\/+$/, ""),
    workerId: e.WORKER_ID,
    registerWebhook: e.WORKER_REGISTER_WEBHOOK !== "false",
    drainIntervalMs: e.WORKER_DRAIN_INTERVAL_MS,
    heartbeatIntervalMs: e.WORKER_HEARTBEAT_INTERVAL_MS,
    retryIntervalMs: e.WORKER_RETRY_INTERVAL_MS,
    leaseTtlMs: e.WORKER_LEASE_TTL_MS,
    appTimeoutMs: e.WORKER_APP_TIMEOUT_MS,
    humanizar: e.WORKER_HUMANIZE !== "0",
  };
}
