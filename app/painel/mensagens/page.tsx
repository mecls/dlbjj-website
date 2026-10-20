import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/config";
import { serviceClient } from "@/lib/supabase/service";
import { Card, PageHeader, StatusBadge, timeAgo } from "@/components/painel/ui";
import { MODALIDADE_LABEL } from "@/lib/bot/flow";
import { STATUS_LABEL, STEP_LABEL, type Lead, type LeadStatus } from "@/lib/bot/types";
import { localPorSlug } from "@/content/site";

const ESTADOS: LeadStatus[] = ["novo", "em_progresso", "concluido", "inscrito", "humano", "perdido", "descartado"];

export const dynamic = "force-dynamic";

export default async function MensagensPage({ searchParams }: { searchParams?: Promise<{ estado?: string; q?: string }> }) {
  await requireAuth();
  const sp = (await searchParams) ?? {};
  const estado = ESTADOS.includes(sp.estado as LeadStatus) ? (sp.estado as LeadStatus) : "";
  const q = (sp.q ?? "").trim().slice(0, 60);

  if (!supabaseConfigured()) {
    return (
      <Card className="p-6">
        <h1 className="text-lg font-semibold">Falta configurar o Supabase</h1>
        <p className="mt-2 text-sm text-app-muted">
          Define <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> em <code>.env.local</code> e
          aplica a migração <code>supabase/migrations/001_dlbjj_onboarding.sql</code>.
        </p>
      </Card>
    );
  }

  const db = serviceClient();
  let consulta = db.from("dlbjj_leads").select("*").order("last_message_at", { ascending: false }).limit(200);
  if (estado) consulta = consulta.eq("status", estado);
  if (q) {
    const termo = q.replace(/[%_,()*]/g, "");
    consulta = consulta.or(`name.ilike.%${termo}%,phone.ilike.%${termo.replace(/\D/g, "") || termo}%`);
  }
  const { data, error } = await consulta;
  const leads = (data ?? []) as Lead[];

  return (
    <div className="space-y-4">
      <PageHeader titulo="Mensagens">
        <span className="text-sm text-app-muted">{`${leads.length} ${leads.length === 1 ? "conversa" : "conversas"}`}</span>
      </PageHeader>

      <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
        <label className="grid gap-1">
          <span className="text-xs text-app-muted">Estado</span>
          <select name="estado" defaultValue={estado} className="rounded-lg border border-app-border px-2 py-1.5">
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {STATUS_LABEL[e]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-app-muted">Nome ou telefone</span>
          <input name="q" defaultValue={q} placeholder="Procurar" className="rounded-lg border border-app-border px-2 py-1.5" />
        </label>
        <button className="rounded-lg border border-app-border bg-white px-3 py-1.5 hover:bg-app-soft">Filtrar</button>
      </form>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Não foi possível ler as leads: {error.message}</p>}

      {leads.length === 0 ? (
        <Card className="p-8 text-center text-sm text-app-muted">
          {estado || q ? "Nenhuma lead com esse filtro." : "Ainda não há leads. Quando alguém escrever no WhatsApp, aparece aqui."}
        </Card>
      ) : (
        <div className="space-y-2">
          {leads.map((l) => (
            <Link key={l.id} href={`/painel/mensagens/${l.phone}`} className="block">
              <Card className="flex items-center gap-3 p-4 transition hover:border-app-icon/40 hover:shadow">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-app-text">
                      {l.name || "Sem nome"}
                    </span>
                    <StatusBadge status={l.status} />
                    {l.paused && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                        bot em pausa
                      </span>
                    )}
                    {l.human_reason?.startsWith("Daniel respondeu") && (
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800">
                        telemóvel
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-app-muted">
                    {l.phone} · {resumo(l)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-app-muted">
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
