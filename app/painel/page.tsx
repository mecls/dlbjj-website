import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { serviceClient } from "@/lib/supabase/service";
import { Card, StatusBadge, timeAgo } from "@/components/painel/ui";
import { MODALIDADE_LABEL } from "@/lib/bot/flow";
import { STEP_LABEL, type Lead } from "@/lib/bot/types";
import { localPorSlug } from "@/content/site";

export const dynamic = "force-dynamic";

function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export default async function PainelPage() {
  await requireAuth();

  if (!supabaseConfigured()) {
    return (
      <Card className="p-6">
        <h1 className="text-lg font-semibold">Falta configurar o Supabase</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Define <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> em <code>.env.local</code> e
          aplica a migração <code>supabase/migrations/001_dlbjj_onboarding.sql</code>.
        </p>
      </Card>
    );
  }

  const db = serviceClient();
  const { data } = await db
    .from("dlbjj_leads")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(200);
  const leads = (data ?? []) as Lead[];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Inscrições</h1>
        <span className="text-sm text-neutral-500">{leads.length} leads</span>
      </div>

      {leads.length === 0 ? (
        <Card className="p-8 text-center text-sm text-neutral-400">
          Ainda não há leads. Quando alguém escrever no WhatsApp, aparece aqui.
        </Card>
      ) : (
        <div className="space-y-2">
          {leads.map((l) => (
            <Link key={l.id} href={`/painel/${l.phone}`} className="block">
              <Card className="flex items-center gap-3 p-4 transition hover:border-neutral-300 hover:shadow">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-neutral-900">
                      {l.name || "Sem nome"}
                    </span>
                    <StatusBadge status={l.status} />
                    {l.paused && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                        bot em pausa
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {l.phone} · {resumo(l)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-neutral-400">
                  {timeAgo(l.last_message_at)}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Resumo de uma linha: passo atual + o que já foi recolhido. */
function resumo(l: Lead): string {
  const partes: string[] = [];
  if (l.status !== "concluido") partes.push(STEP_LABEL[l.step]);
  if (l.modalidade) partes.push(MODALIDADE_LABEL[l.modalidade]);
  if (l.local_slug) partes.push(localPorSlug(l.local_slug)?.nome ?? l.local_slug);
  if (l.horario) partes.push(l.horario);
  return partes.join(" · ") || "novo contacto";
}
