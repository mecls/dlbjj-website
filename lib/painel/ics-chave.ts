import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { serviceClient } from "@/lib/supabase/service";

/**
 * A chave privada do feed ICS (ajustes §2.5, revisão I3): um segredo
 * ALEATÓRIO guardado em dlbjj_settings (`ics_chave`), criado à primeira
 * leitura e rodado com «Gerar nova chave». Não deriva da password do painel:
 * o endereço do feed anda pelo Google, pelo Apple Calendar e pelos registos
 * de pedidos, e não pode ser uma pista para a única credencial do painel.
 * Sem DASHBOARD_PASSWORD não há feed (a mesma porta do painel).
 */
const CHAVE = "ics_chave";

function ativo(): boolean {
  return Boolean(process.env.DASHBOARD_PASSWORD);
}

export async function criarChaveIcs(): Promise<string> {
  const chave = randomBytes(32).toString("hex");
  const { error } = await serviceClient().from("dlbjj_settings").upsert({ key: CHAVE, value: chave }, { onConflict: "key" });
  if (error) throw new Error(`criarChaveIcs: ${error.message}`);
  return chave;
}

/** A chave atual (cria-a à primeira vez); null quando o painel não tem password. */
export async function obterChaveIcs(): Promise<string | null> {
  if (!ativo()) return null;
  const { data } = await serviceClient().from("dlbjj_settings").select("value").eq("key", CHAVE).maybeSingle();
  const atual = data?.value as string | undefined;
  return atual && /^[0-9a-f]{64}$/.test(atual) ? atual : criarChaveIcs();
}

/** Comparação em tempo constante, por bytes (um carácter multibyte não pode rebentar). */
export async function chaveValida(dada: string | null): Promise<boolean> {
  const esperada = await obterChaveIcs();
  if (!esperada || !dada) return false;
  const a = Buffer.from(dada);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
