import type { NextRequest } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { nifValido, SLUGS } from "@/lib/inscricao/validar";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";

export const runtime = "nodejs";

const TEXTO = ["nome", "email", "morada", "enc_nome", "enc_telefone", "enc_relacao", "contacto_emergencia_nome", "contacto_emergencia_telefone", "condicoes_saude", "notas"] as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { id } = await params;
  const { um } = await campos(req);
  const patch: Record<string, unknown> = {};
  for (const k of TEXTO) if (k in um) patch[k] = um[k].trim() || null;
  if (!patch.nome) return voltar(`/painel/alunos/${id}`, { erro: "invalido" });
  if ("nif" in um) {
    const nif = um.nif.replace(/\D/g, "");
    if (nif && !nifValido(nif)) return voltar(`/painel/alunos/${id}`, { erro: "NIF inválido" });
    patch.nif = nif || null;
  }
  if (um.inicio_em) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(um.inicio_em)) return voltar(`/painel/alunos/${id}`, { erro: "invalido" });
    patch.inicio_em = um.inicio_em;
  }
  if (um.local_slug) {
    if (!SLUGS.includes(um.local_slug)) return voltar(`/painel/alunos/${id}`, { erro: "invalido" });
    patch.local_slug = um.local_slug;
  }
  await serviceClient().from("dlbjj_alunos").update(patch).eq("id", id).neq("estado", "anonimizado");
  return voltar(`/painel/alunos/${id}`, { ok: "1" });
}
