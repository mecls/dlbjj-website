import { randomBytes } from "node:crypto";
import { db } from "./db";
import { E2E_URL } from "./app";
import { hashToken } from "@/lib/tokens";

/** O valor de um Set-Cookie da resposta, como "nome=valor" (para reenviar). */
export function cookieDe(r: Response, nome: string): string {
  const linha = r.headers.getSetCookie().find((c) => c.startsWith(`${nome}=`));
  if (!linha) throw new Error(`sem cookie ${nome} em ${r.url || "resposta"}`);
  return linha.split(";")[0];
}

/** Uma sessão de aluno inserida diretamente (sem passar pelo código). Devolve o cookie. */
export async function sessaoDe(alunoId: string, phone: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const { error } = await db().from("dlbjj_sessoes_aluno").insert({
    token_hash: hashToken(token),
    phone,
    aluno_id: alunoId,
    expira_em: new Date(Date.now() + 90 * 86_400_000).toISOString(),
  });
  if (error) throw new Error(`sessaoDe: ${error.message}`);
  return `dlbjj_aluno=${token}`;
}

export function getAluno(path: string, cookie?: string): Promise<Response> {
  return fetch(`${E2E_URL}${path}`, { headers: cookie ? { cookie } : {}, redirect: "manual" });
}

export function postAluno(path: string, campos: Record<string, string>, cookie?: string): Promise<Response> {
  const body = new URLSearchParams(campos);
  return fetch(`${E2E_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...(cookie ? { cookie } : {}) },
    body: body.toString(),
    redirect: "manual",
  });
}

/** Passo 1 do login: pede o código; devolve a resposta e o cookie `dlbjj_entrar`. */
export async function pedirCodigo(telefone: string): Promise<{ r: Response; entrar: string }> {
  const r = await postAluno("/api/aluno/codigo", { telefone });
  let entrar = "";
  try {
    entrar = cookieDe(r, "dlbjj_entrar");
  } catch {
    /* sem cookie (erro de limite, por exemplo) */
  }
  return { r, entrar };
}
