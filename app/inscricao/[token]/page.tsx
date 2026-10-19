import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serviceClient } from "@/lib/supabase/service";
import { turmasAtivas } from "@/lib/alunos/consultas";
import { ESTILO_FORMULARIO, formularioHtml } from "@/lib/inscricao/formulario";
import { verificarToken } from "@/lib/tokens-db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Inscrição — Academia DL-BJJ",
  robots: { index: false, follow: false },
};

/**
 * O formulário de inscrição por link (spec §3 B). O proxy.ts já validou o
 * token (410 se não servir); aqui valida-se outra vez e pré-preenche-se com
 * o que a lead já disse ao bot.
 */
export default async function PaginaInscricao({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { avaliacao, row } = await verificarToken(token, "inscricao");
  if (!avaliacao.ok) notFound();

  const db = serviceClient();
  const { data: lead } = row?.lead_id
    ? await db.from("dlbjj_leads").select("name,phone,modalidade,local_slug,publico,collected").eq("id", row.lead_id).maybeSingle()
    : { data: null };
  const turmas = await turmasAtivas();

  const valores: Record<string, string> = {
    nome: lead?.name ?? "",
    phone: lead?.phone ?? "",
    modalidade: lead?.modalidade ?? "",
    local_slug: lead?.local_slug ?? "",
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-10 text-neutral-900">
      <style>{ESTILO_FORMULARIO}</style>
      <p className="text-xs font-bold tracking-widest text-dl-red">DL-BJJ</p>
      <h1 className="mt-1 text-2xl font-semibold">Inscrição</h1>
      <p className="mb-6 text-sm text-neutral-500">Demora 2 minutos. Os dados ficam só com a academia.</p>
      <div dangerouslySetInnerHTML={{ __html: formularioHtml({ action: `/api/inscricao/${encodeURIComponent(token)}`, valores, erros: {}, turmas }) }} />
    </main>
  );
}
