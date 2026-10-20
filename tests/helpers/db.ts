import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

/** Cliente service-role contra o Supabase local (.env.test). */
export function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.test");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Repõe a base de dados local: migrações + seed.sql + turmas de site.ts.
 * Lento (~10 s); chamar uma vez por ficheiro de teste, não por teste.
 */
export function resetDb(): void {
  if (process.env.DLBJJ_SKIP_RESET === "1") return; // para ver um teste falhar contra o esquema atual
  // O `db reset` reinicia os containers; num Docker apertado (Colima com 2 CPU
  // e três projetos Supabase) a ligação ao Postgres falha de vez em quando com
  // "dial tcp … i/o timeout". Três tentativas, com uma pausa entre elas.
  let ultimo: unknown = null;
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      execSync("supabase db reset --local", { cwd: repoRoot, stdio: "pipe" });
      execSync("npx tsx scripts/seed-turmas.ts", { cwd: repoRoot, stdio: "pipe" });
      return;
    } catch (e) {
      ultimo = e;
      execSync("sleep 8");
    }
  }
  throw ultimo;
}

export const FIXTURES = {
  leads: {
    novo: { id: "a0000000-0000-0000-0000-000000000001", phone: "351910000001" },
    emProgresso: { id: "a0000000-0000-0000-0000-000000000002", phone: "351910000002" },
    concluido: { id: "a0000000-0000-0000-0000-000000000003", phone: "351910000003" },
  },
  alunos: {
    ana: { id: "b0000000-0000-0000-0000-000000000001", phone: "351920000001" },
    rui: { id: "b0000000-0000-0000-0000-000000000002", phone: "351920000002" },
    joao: { id: "b0000000-0000-0000-0000-000000000003", phone: "351920000003" },
    ines: { id: "b0000000-0000-0000-0000-000000000004", phone: "351920000003" },
  },
  eventos: {
    seminario: { id: "c0000000-0000-0000-0000-000000000001" },
    graduacao: { id: "c0000000-0000-0000-0000-000000000002" },
  },
  optOutPhone: "351930000009",
} as const;
