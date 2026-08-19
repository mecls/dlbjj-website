import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";

/**
 * Autenticação simples do painel: uma password partilhada (env DASHBOARD_PASSWORD)
 * e um cookie httpOnly assinado. Chega para um único admin (o Daniel), sem
 * gestão de utilizadores. Se DASHBOARD_PASSWORD não estiver definida, o painel
 * fica aberto (conveniência de dev) — em produção, definir sempre.
 */

const COOKIE = "dlbjj_painel";

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
  if (!expected) return true; // sem password → aberto (dev)
  const store = await cookies();
  return store.get(COOKIE)?.value === expected;
}

export async function requireAuth(): Promise<void> {
  if (!(await isAuthed())) redirect("/painel/login");
}

/** Chamado a partir de uma server action. Define o cookie se a password bater. */
export async function loginWith(password: string): Promise<boolean> {
  const pw = process.env.DASHBOARD_PASSWORD;
  if (!pw) return true; // sem password configurada → entra
  if (password !== pw) return false;
  const store = await cookies();
  store.set(COOKIE, expectedToken()!, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
