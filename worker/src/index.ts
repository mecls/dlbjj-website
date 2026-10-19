/**
 * O worker do agente DL-BJJ — um processo Node de longa duração que é dono de
 * duas coisas que a app na Vercel não pode ser: o socket do WhatsApp (via o
 * gateway) e o relógio. Zero lógica de negócio.
 *
 *   gateway ──webhook──▶ worker ──/api/agent/inbound──▶ app   (decidir)
 *                               ◀──── dlbjj_fila_saida ────    (executar)
 *
 * Ordem de arranque, e porquê:
 *   1. config — rebenta já se faltar alguma coisa;
 *   2. transporte + registo do webhook (idempotente, reescreve o segredo);
 *   3. servidor HTTP — agora podemos receber;
 *   4. reconciliar envios interrompidos ANTES de a drenagem olhar para a fila;
 *   5. temporizadores; heartbeat imediato.
 */
import { loadConfig } from "./config";
import { criarDb } from "./db";
import { criarDispatcher } from "./dispatch";
import { startWebhookServer } from "./inbound/webhook";
import { registrySize } from "./inbound/handoff";
import { retomarFalhadas } from "./inbound/forward";
import { log } from "./log";
import { drainInFlight, drainOnce, libertarTudo, reconciliarInterrompidas, type DrainerDeps } from "./outbound/drainer";
import { heartbeat } from "./scheduler/heartbeat";
import { iniciar } from "./scheduler/tick";
import { OpenWaTransport } from "./transport/openwa";

/** Só estes eventos. Sem presença (§6.13), sem grupos nem estados (filtrados na origem). */
export const WEBHOOK_EVENTS = [
  "message.received",
  "message.sent",
  "message.ack",
  "message.failed",
  "session.status",
  "session.qr",
  "session.authenticated",
  "session.disconnected",
  "session.restriction",
  "session.reconnect_loop",
  "call.received",
  "call.missed",
];

async function main(): Promise<void> {
  const config = loadConfig();
  log.info("worker dlbjj a arrancar", { workerId: config.workerId, app: config.appBaseUrl, gateway: config.openwaBaseUrl });

  const db = criarDb(config.supabaseUrl, config.supabaseKey);
  const transport = new OpenWaTransport({ baseUrl: config.openwaBaseUrl, apiKey: config.openwaApiKey, sessionId: config.openwaSessionId });
  const deps: DrainerDeps = { db, transport, config: { workerId: config.workerId, humanizar: config.humanizar, leaseTtlMs: config.leaseTtlMs } };
  const dispatch = criarDispatcher({ db, transport, appBaseUrl: config.appBaseUrl, token: config.workerToken, timeoutMs: config.appTimeoutMs, pausaHoras: 24 });

  const servidor = await startWebhookServer({
    port: config.port,
    path: config.webhookPath,
    secret: config.openwaWebhookSecret,
    onEvent: dispatch,
    health: () => ({ workerId: config.workerId, ecosConhecidos: registrySize(), aEnviar: drainInFlight() }),
  });
  log.info("a receber webhooks", { port: config.port, path: config.webhookPath });

  if (config.registerWebhook) await garantirWebhook(transport, `${config.publicUrl}${config.webhookPath}`, config.openwaWebhookSecret);

  await reconciliarInterrompidas(deps);

  const timers = iniciar([
    { nome: "drenar", intervaloMs: config.drainIntervalMs, correr: async () => void (await drainOnce(deps)) },
    { nome: "heartbeat", intervaloMs: config.heartbeatIntervalMs, correr: () => heartbeat({ db, transport }) },
    {
      nome: "retomar-entradas",
      intervaloMs: config.retryIntervalMs,
      correr: async () => void (await retomarFalhadas({ db, appBaseUrl: config.appBaseUrl, token: config.workerToken, timeoutMs: config.appTimeoutMs })),
    },
  ]);
  void heartbeat({ db, transport });

  let aFechar = false;
  const parar = async (sinal: string) => {
    if (aFechar) return;
    aFechar = true;
    log.info("a parar", { sinal });
    timers.parar();
    await servidor.close();
    const limite = Date.now() + 60_000;
    while ((servidor.pending() > 0 || drainInFlight() > 0 || timers.emCurso() > 0) && Date.now() < limite) {
      await new Promise((r) => setTimeout(r, 250));
    }
    const libertadas = await libertarTudo(deps);
    log.info("parado", { libertadas });
    process.exit(0);
  };
  process.on("SIGTERM", () => void parar("SIGTERM"));
  process.on("SIGINT", () => void parar("SIGINT"));
  process.on("unhandledRejection", (reason) => log.error("rejeição sem handler", { error: reason instanceof Error ? reason : String(reason) }));
}

/** Lista as subscrições; cria a nossa se faltar e REESCREVE-A se existir (o segredo não se lê de volta). */
async function garantirWebhook(transport: OpenWaTransport, url: string, secret: string): Promise<void> {
  try {
    const existentes = await transport.listWebhooks();
    const nossa = existentes.find((w) => w.url === url);
    if (nossa) {
      await transport.updateWebhook(nossa.id, { url, events: WEBHOOK_EVENTS, secret });
      log.info("subscrição do webhook reescrita", { url, id: nossa.id });
      return;
    }
    await transport.createWebhook({ url, events: WEBHOOK_EVENTS, secret });
    log.info("webhook registado", { url });
  } catch (e) {
    log.warn("registo do webhook falhou; regista à mão se não chegarem mensagens", { url, error: e });
  }
}

void main().catch((e) => {
  log.error("o worker não arrancou", { error: e instanceof Error ? e : String(e) });
  process.exit(1);
});
