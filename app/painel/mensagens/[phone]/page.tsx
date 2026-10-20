import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { serviceClient } from "@/lib/supabase/service";
import { Card, StatusBadge } from "@/components/painel/ui";
import { ThreadBody } from "@/components/painel/thread-body";
import { ReplyBox } from "@/components/painel/reply-box";
import { LeadActions } from "@/components/painel/lead-actions";
import { MODALIDADE_LABEL, ORIGEM_LABEL } from "@/lib/bot/flow";
import { STEP_LABEL, type Lead, type LeadMessage } from "@/lib/bot/types";
import { localPorSlug } from "@/content/site";

export const dynamic = "force-dynamic";

export default async function LeadPage({
  params,
}: {
  params: Promise<{ phone: string }>;
}) {
  await requireAuth();
  const { phone } = await params;
  const db = serviceClient();

  const [{ data: leadRow }, { data: msgs }] = await Promise.all([
    db.from("dlbjj_leads").select("*").eq("phone", phone).maybeSingle(),
    db
      .from("dlbjj_mensagens")
      .select("*")
      .eq("phone", phone)
      .order("created_at", { ascending: true }),
  ]);

  const lead = leadRow as Lead | null;
  const messages = (msgs ?? []) as LeadMessage[];

  if (!lead) {
    return (
      <div className="space-y-4">
        <Link href="/painel/mensagens" className="text-sm text-neutral-500 hover:underline">
          ← Mensagens
        </Link>
        <Card className="p-8 text-center text-sm text-neutral-400">
          Lead não encontrada ({phone}).
        </Card>
      </div>
    );
  }

  const local = lead.local_slug ? localPorSlug(lead.local_slug) : undefined;

  return (
    <div className="space-y-4">
      <Link href="/painel/mensagens" className="text-sm text-neutral-500 hover:underline">
        ← Mensagens
      </Link>

      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        {/* Ficha de cliente */}
        <Card className="h-fit p-5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-neutral-900">
              {lead.name || "Sem nome"}
            </h1>
            <StatusBadge status={lead.status} />
          </div>
          <p className="mt-0.5 text-sm text-neutral-500">{lead.phone}</p>

          <dl className="mt-4 space-y-2 text-sm">
            <Linha rotulo="Passo" valor={STEP_LABEL[lead.step]} />
            <Linha
              rotulo="Para"
              valor={
                lead.publico
                  ? lead.publico === "kids"
                    ? "Filho/a (kids)"
                    : "Adulto"
                  : "—"
              }
            />
            <Linha
              rotulo="Modalidade"
              valor={lead.modalidade ? MODALIDADE_LABEL[lead.modalidade] : "—"}
            />
            <Linha
              rotulo="Espaço"
              valor={local ? `${local.nome}${local.morada ? ` — ${local.morada}` : ""}` : "—"}
            />
            <Linha
              rotulo="Aula"
              valor={
                lead.turma
                  ? `${lead.turma} · ${lead.dias ?? ""} · ${lead.horario ?? ""}`
                  : "—"
              }
            />
            <Linha
              rotulo="Como conheceu"
              valor={lead.origem ? (ORIGEM_LABEL[lead.origem] ?? lead.origem) : "—"}
            />
            {typeof lead.collected?.primeira_mensagem === "string" && (
              <Linha
                rotulo="Primeira mensagem"
                valor={lead.collected.primeira_mensagem}
              />
            )}
            {lead.human_reason && (
              <Linha rotulo="Nota" valor={lead.human_reason} />
            )}
          </dl>
          {lead.aluno_id && (
            <p className="mt-3 text-sm">
              <Link href={`/painel/alunos/${lead.aluno_id}`} className="text-dl-red hover:underline">
                Ver aluno →
              </Link>
            </p>
          )}

          <div className="mt-5 border-t border-neutral-100 pt-4">
            <LeadActions phone={lead.phone} paused={lead.paused} />
          </div>
        </Card>

        {/* Conversa */}
        <Card className="flex min-h-[28rem] flex-col overflow-hidden">
          <div className="border-b border-neutral-100 px-4 py-2 text-sm font-semibold">
            Conversa
            {lead.paused && (
              <span className="ml-2 text-xs font-normal text-amber-700">
                (bot em pausa — respostas manuais)
              </span>
            )}
          </div>
          <ThreadBody messages={messages} />
          <ReplyBox phone={lead.phone} />
        </Card>
      </div>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-neutral-400">{rotulo}</dt>
      <dd className="text-neutral-800">{valor}</dd>
    </div>
  );
}
