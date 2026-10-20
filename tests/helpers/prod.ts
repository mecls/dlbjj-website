import { execSync, spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { repoRoot } from "./db";

export const PROD_PORT = 3101;
export const PROD_URL = `http://127.0.0.1:${PROD_PORT}`;

/**
 * `next build` + `next start` em produção com o MÍNIMO de ambiente: só o
 * Supabase. Sem DASHBOARD_PASSWORD, DLBJJ_WORKER_TOKEN nem CRON_SECRET — o
 * pior caso de uma variável esquecida na Vercel (spec §6.14, AC-11).
 */
export async function startProdApp(): Promise<{ stop: () => Promise<void> }> {
  const base = parse(readFileSync(`${repoRoot}.env.test`));
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODE_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: base.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: base.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: base.SUPABASE_SERVICE_ROLE_KEY,
    OLLAMA_FAKE: "1",
    // Explicitamente vazios: o `next start` lê o .env.local de quem desenvolve
    // (com os segredos de teste) e só preenche o que ainda não estiver definido.
    // Sem isto, um .env.local no disco transforma os 503 em 401.
    DASHBOARD_PASSWORD: "",
    DLBJJ_WORKER_TOKEN: "",
    CRON_SECRET: "",
  };
  execSync(`${repoRoot}node_modules/.bin/next build`, { cwd: repoRoot, env, stdio: "pipe" });
  const child: ChildProcess = spawn(`${repoRoot}node_modules/.bin/next`, ["start", "-p", String(PROD_PORT), "-H", "127.0.0.1"], {
    cwd: repoRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  const limite = Date.now() + 60_000;
  while (Date.now() < limite) {
    try {
      const r = await fetch(`${PROD_URL}/painel`, { redirect: "manual", signal: AbortSignal.timeout(2_000) });
      if (r.status > 0) break;
    } catch {
      /* ainda a arrancar */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return {
    stop: async () => {
      try { process.kill(-child.pid!, "SIGTERM"); } catch { /* já morreu */ }
      await new Promise((r) => setTimeout(r, 500));
      try { process.kill(-child.pid!, "SIGKILL"); } catch { /* já morreu */ }
    },
  };
}
