import { execSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

export function db(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.test)");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function resetDb(): void {
  execSync("supabase db reset --local", { cwd: repoRoot, stdio: "pipe" });
  execSync("npx tsx scripts/seed-turmas.ts", { cwd: repoRoot, stdio: "pipe" });
}

export const FIXTURES = {
  leads: {
    novo: { id: "a0000000-0000-0000-0000-000000000001", phone: "351910000001" },
    emProgresso: { id: "a0000000-0000-0000-0000-000000000002", phone: "351910000002" },
    concluido: { id: "a0000000-0000-0000-0000-000000000003", phone: "351910000003" },
  },
  optOutPhone: "351930000009",
} as const;

/** Uma app de mentira: recebe POST /api/agent/inbound e faz o que o teste mandar. */
export interface StubApp {
  url: string;
  pedidos: { headers: Record<string, string | string[] | undefined>; body: unknown }[];
  modo: { status: number };
  onInbound: ((body: { from: string; text: string }) => Promise<void>) | null;
  close(): Promise<void>;
}

export async function startStubApp(): Promise<StubApp> {
  const stub: StubApp = { url: "", pedidos: [], modo: { status: 200 }, onInbound: null, close: async () => {} };
  const server: Server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const raw = Buffer.concat(chunks).toString("utf8");
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = raw;
    }
    stub.pedidos.push({ headers: req.headers, body });
    if (req.url === "/api/agent/inbound" && stub.modo.status === 200 && stub.onInbound) {
      await stub.onInbound(body as { from: string; text: string });
    }
    res.writeHead(stub.modo.status, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: stub.modo.status === 200 }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  stub.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  stub.close = () =>
    new Promise<void>((resolve) => {
      server.closeAllConnections?.();
      server.close(() => resolve());
    });
  return stub;
}

export const PASSADO = () => new Date(Date.now() - 60_000).toISOString();
