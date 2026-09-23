import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { isProduction } from "@/lib/config";

/**
 * Autenticação simples do painel: uma password partilhada (env DASHBOARD_PASSWORD)
 * e um cookie httpOnly assinado. Chega para um único admin (o Daniel), sem
 * gestão de utilizadores.
 *
 * Sem DASHBOARD_PASSWORD o painel fica aberto — mas SÓ em desenvolvimento. Em
 * produção, a falta da variável fecha o painel em vez de o abrir: o painel mostra
 * nomes, telefones e conversas de pessoas reais, e uma variável esquecida no
 * Vercel não pode ser a diferença entre privado e público.
 */

const COOKIE = "dlbjj_painel";

/** Em produção sem password: fechado. Em dev sem password: aberto. */
export function passwordConfigured(): boolean {
  return Boolean(process.env.DASHBOARD_PASSWORD);
}

function expectedToken(): string | null {
  const pw = process.env.DASHBOARD_PASSWORD;
  if (!pw) return null;
  return crypto
    .createHmac("sha256", pw)
    .update("dlbjj-painel-v1")
    .digest("hex");
}

export async function isAuthed(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return !isProduction(); // sem password: aberto em dev, fechado em produção
  const store = await cookies();
  const got = store.get(COOKIE)?.value;
  if (!got || got.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export async function requireAuth(): Promise<void> {
  if (!(await isAuthed())) redirect("/painel/login");
}

/**
 * Guarda para SERVER ACTIONS. As páginas usam `requireAuth()` (que redireciona),
 * mas uma server action é um endpoint público como qualquer outro — a
 * documentação do Next 16 é explícita: uma verificação numa página ou layout
 * "will not prevent nested route segments and Server Actions from being
 * accessed". Por isso cada mutação verifica outra vez, aqui, e rebenta em vez de
 * redirecionar.
 */
export async function assertAuthed(): Promise<void> {
  if (!(await isAuthed())) throw new Error("Não autorizado.");
}

/** Chamado a partir de uma server action. Define o cookie se a password bater. */
export async function loginWith(password: string): Promise<boolean> {
  const pw = process.env.DASHBOARD_PASSWORD;
  if (!pw) return !isProduction(); // sem password: só entra em dev
  const a = Buffer.from(password);
  const b = Buffer.from(pw);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const store = await cookies();
  store.set(COOKIE, expectedToken()!, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
