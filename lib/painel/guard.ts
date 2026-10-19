import "server-only";
import { NextResponse } from "next/server";
import { assertAuthed } from "@/lib/auth";

/**
 * Route handlers do painel: mesma sessão (cookie) das páginas; sem sessão → 401.
 * Os formulários do painel são HTML puro e fazem POST aqui; a resposta é um
 * 303 de volta à página (com ?erro=… quando algo correu mal).
 */
export async function sessaoOu401(): Promise<NextResponse | null> {
  try {
    await assertAuthed();
    return null;
  } catch {
    return new NextResponse("Não autorizado", { status: 401 });
  }
}

export function voltar(path: string, params?: Record<string, string>): NextResponse {
  const url = new URL(path, "http://painel");
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
  return new NextResponse(null, { status: 303, headers: { location: `${url.pathname}${url.search}` } });
}

export async function campos(req: Request): Promise<{ um: Record<string, string>; muitos: Record<string, string[]> }> {
  const fd = await req.formData();
  const um: Record<string, string> = {};
  const muitos: Record<string, string[]> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    um[k] = v;
    (muitos[k] ??= []).push(v);
  }
  return { um, muitos };
}
