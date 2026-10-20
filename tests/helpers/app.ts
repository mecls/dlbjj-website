import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { repoRoot } from "./db";

export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E_URL = `http://127.0.0.1:${E2E_PORT}`;

/** Variáveis de .env.test, por cima do ambiente atual (o Next não as sobrepõe). */
export function envDeTeste(): NodeJS.ProcessEnv {
  const ficheiro = parse(readFileSync(`${repoRoot}.env.test`));
  return { ...process.env, ...ficheiro, APP_BASE_URL: E2E_URL };
}

async function pronto(): Promise<boolean> {
  try {
    const r = await fetch(`${E2E_URL}/api/sim/inject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(5_000),
    });
    return r.status === 400; // "from is required" → a rota existe e compilou
  } catch {
    return false;
  }
}

/**
 * Arranca `next dev` na porta de e2e com o ambiente de teste e espera até a
 * rota do simulador responder. Devolve como parar. Se já houver uma app a
 * responder na porta, reutiliza-a e `stop()` não faz nada.
 */
export async function startApp(): Promise<{ baseUrl: string; stop: () => Promise<void> }> {
  if (await pronto()) return { baseUrl: E2E_URL, stop: async () => {} };

  const child: ChildProcess = spawn(
    `${repoRoot}node_modules/.bin/next`,
    ["dev", "-p", String(E2E_PORT), "-H", "127.0.0.1"],
    { cwd: repoRoot, env: envDeTeste(), stdio: ["ignore", "pipe", "pipe"], detached: true },
  );
  let saida = "";
  child.stdout?.on("data", (d) => (saida += String(d)));
  child.stderr?.on("data", (d) => (saida += String(d)));

  const limite = Date.now() + 120_000;
  while (Date.now() < limite) {
    if (await pronto()) break;
    if (child.exitCode !== null) throw new Error(`next dev morreu:\n${saida.slice(-2000)}`);
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!(await pronto())) {
    try { process.kill(-child.pid!, "SIGTERM"); } catch { /* já morreu */ }
    throw new Error(`next dev não ficou pronto em 120 s (NODE_ENV=${process.env.NODE_ENV ?? ""} VERCEL_ENV=${process.env.VERCEL_ENV ?? ""}):\n${saida.slice(-2000)}`);
  }

  return {
    baseUrl: E2E_URL,
    stop: async () => {
      try { process.kill(-child.pid!, "SIGTERM"); } catch { /* já morreu */ }
      await new Promise((r) => setTimeout(r, 500));
      try { process.kill(-child.pid!, "SIGKILL"); } catch { /* já morreu */ }
    },
  };
}

/** Injeta uma mensagem no motor (rota do simulador). */
export async function inject(msg: { from: string; text?: string; name?: string; buttonId?: string; agora?: string }): Promise<Response> {
  return fetch(`${E2E_URL}/api/sim/inject`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(msg),
  });
}

/** Últimas linhas da fila de saída para um número (corpo e tipo), por ordem. */
export async function filaDe(sb: import("@supabase/supabase-js").SupabaseClient, phone: string) {
  const { data } = await sb
    .from("dlbjj_fila_saida")
    .select("kind,corpo,estado,erro,regra")
    .eq("phone", phone)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function scenario(nome: string, phone?: string): Promise<{ phone: string }> {
  const q = new URLSearchParams({ nome, ...(phone ? { phone } : {}) });
  const r = await fetch(`${E2E_URL}/api/sim/scenario?${q}`, { method: "POST" });
  if (!r.ok) throw new Error(`cenário ${nome}: ${r.status} ${await r.text()}`);
  return (await r.json()) as { phone: string };
}
