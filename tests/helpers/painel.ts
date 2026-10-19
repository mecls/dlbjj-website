import { createHmac } from "node:crypto";
import { E2E_URL } from "./app";

/** O cookie do painel, tal como lib/auth.ts o assina: HMAC(password, "dlbjj-painel-v1"). */
export function cookiePainel(): string {
  const pw = process.env.DASHBOARD_PASSWORD ?? "";
  const token = createHmac("sha256", pw).update("dlbjj-painel-v1").digest("hex");
  return `dlbjj_painel=${token}`;
}

export function getPainel(path: string, autenticado = true): Promise<Response> {
  return fetch(`${E2E_URL}${path}`, { headers: autenticado ? { cookie: cookiePainel() } : {}, redirect: "manual" });
}

export function postPainel(path: string, campos: Record<string, string | string[]>, autenticado = true): Promise<Response> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(campos)) {
    if (Array.isArray(v)) for (const x of v) body.append(k, x);
    else body.append(k, v);
  }
  return fetch(`${E2E_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...(autenticado ? { cookie: cookiePainel() } : {}) },
    body: body.toString(),
    redirect: "manual",
  });
}
