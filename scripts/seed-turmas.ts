/**
 * Semeia dlbjj_turmas a partir de content/site.ts (a fonte única de horários).
 *
 *   npx tsx scripts/seed-turmas.ts          # upsert por `chave`; o que saiu do site fica ativa=false
 *   npx tsx scripts/seed-turmas.ts --check  # sai 1 se a BD divergir do site.ts
 *
 * Lê .env.local (dev) ou .env.test (testes) — o primeiro que existir, ou o que
 * DLBJJ_ENV_FILE apontar.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { locais } from "../content/site";
import { diasParaSemana } from "../lib/turmas/dias";

const envFile =
  process.env.DLBJJ_ENV_FILE ??
  [".env.local", ".env.test"].map((f) => resolve(process.cwd(), f)).find((f) => existsSync(f));
if (envFile) config({ path: envFile, quiet: true });

export type TurmaSemente = {
  chave: string;
  local_slug: string;
  turma: string;
  dias: string;
  dias_semana: number[];
  horario: string;
  tipo: "kids" | "jiu-jitsu" | "mma" | "misto";
};

export function turmasDoSite(): TurmaSemente[] {
  return locais.flatMap((l) =>
    l.aulas.map((a) => ({
      chave: `${l.slug}|${a.turma}|${a.dias}|${a.horario}`,
      local_slug: l.slug,
      turma: a.turma,
      dias: a.dias,
      dias_semana: diasParaSemana(a.dias),
      horario: a.horario,
      tipo: a.tipo,
    })),
  );
}

async function main() {
  const check = process.argv.includes("--check");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Falta NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(2);
  }
  const db = createClient(url, key, { auth: { persistSession: false } });
  const sementes = turmasDoSite();

  if (check) {
    const { data, error } = await db.from("dlbjj_turmas").select("chave,dias_semana,horario,tipo,ativa");
    if (error) throw error;
    const naBd = new Map((data ?? []).map((t) => [t.chave, t]));
    const problemas: string[] = [];
    for (const s of sementes) {
      const t = naBd.get(s.chave);
      if (!t) problemas.push(`falta na BD: ${s.chave}`);
      else if (!t.ativa) problemas.push(`inativa na BD mas existe no site: ${s.chave}`);
      else if (t.horario.slice(0, 5) !== s.horario || t.tipo !== s.tipo || JSON.stringify(t.dias_semana) !== JSON.stringify(s.dias_semana))
        problemas.push(`difere: ${s.chave}`);
    }
    for (const t of naBd.values()) {
      if (t.ativa && !sementes.some((s) => s.chave === t.chave)) problemas.push(`ativa na BD mas não está no site: ${t.chave}`);
    }
    if (problemas.length) {
      console.error(problemas.join("\n"));
      process.exit(1);
    }
    console.log(`ok: ${sementes.length} turmas iguais ao site`);
    return;
  }

  const { error } = await db.from("dlbjj_turmas").upsert(
    sementes.map((s) => ({ ...s, ativa: true })),
    { onConflict: "chave" },
  );
  if (error) throw error;
  const chaves = sementes.map((s) => s.chave);
  const { error: e2 } = await db
    .from("dlbjj_turmas")
    .update({ ativa: false })
    .not("chave", "in", `(${chaves.map((c) => `"${c.replace(/"/g, '\\"')}"`).join(",")})`);
  if (e2) throw e2;
  console.log(`${sementes.length} turmas`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
