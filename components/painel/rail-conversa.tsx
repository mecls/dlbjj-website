import Link from "next/link";
import { localPorSlug } from "@/content/site";
import { LeadActions } from "@/components/painel/lead-actions";
import { StatusBadge, timeAgo } from "@/components/painel/ui";
import { MODALIDADE_LABEL, ORIGEM_LABEL } from "@/lib/bot/flow";
import { STEP_LABEL, type Lead } from "@/lib/bot/types";
import { dataPt, diaCurto } from "@/lib/datas-pt";
import type { ResumoRow } from "@/lib/painel/resumo";

/**
 * O painel lateral da conversa (ajustes §2.2): a pessoa, a situação (o resumo
 * do modelo), os factos da lead, as ações e a ligação ao aluno.
 */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-app-muted">{children}</h2>;
}

function Seccao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-app-border px-5 py-5 last:border-b-0">
      <Eyebrow>{titulo}</Eyebrow>
      {children}
    </section>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <dt className="w-28 shrink-0 text-app-muted">{rotulo}</dt>
      <dd className="min-w-0 break-words text-app-text">{valor}</dd>
    </div>
  );
}

export function RailConversa({
  lead,
  totalMensagens,
  resumo,
  desatualizado,
  erro,
}: {
  lead: Lead;
  totalMensagens: number;
  resumo: ResumoRow | null;
  desatualizado: boolean;
  erro?: string;
}) {
  const local = lead.local_slug ? localPorSlug(lead.local_slug) : undefined;
  const acaoResumo = `/api/painel/leads/${lead.phone}/resumo`;
  return (
    <aside data-rail className="text-app-text">
      <Seccao titulo="Pessoa">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-bold">{lead.name || "Sem nome"}</p>
          <StatusBadge status={lead.status} />
          {lead.paused && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">bot em pausa</span>}
          {lead.human_reason?.startsWith("Daniel respondeu") && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800">telemóvel</span>}
        </div>
        <p className="mt-1 text-sm text-app-muted">{lead.phone}</p>
        <p className="text-sm text-app-muted">{`primeiro contacto ${dataPt(lead.first_contact_at.slice(0, 10))}`}</p>
      </Seccao>

      <Seccao titulo="Situação">
        {erro === "resumo" ? <p className="mb-2 text-sm text-red-700">Não consegui resumir. Tenta outra vez.</p> : null}
        {totalMensagens === 0 || erro === "sem_conversa" ? (
          <p className="text-sm text-app-muted">Ainda não há conversa para resumir.</p>
        ) : !resumo ? (
          <form method="post" action={acaoResumo}>
            <button className="rounded-lg border border-app-border px-3 py-1.5 text-sm font-medium hover:bg-app-soft">Escrever resumo</button>
          </form>
        ) : (
          <>
            <p className="text-[15px] leading-snug">{resumo.situacao}</p>
            <p className="mt-2 text-sm text-app-muted">{resumo.quer}</p>
            {desatualizado ? <p className="mt-2 text-sm text-app-muted">Há conversa depois disto.</p> : null}
            <p className="mt-3 text-xs text-app-muted">{`${resumo.mensagens} ${resumo.mensagens === 1 ? "mensagem" : "mensagens"} · até ${diaCurto(resumo.ate.slice(0, 10))} · ${timeAgo(resumo.em)}`}</p>
            <form method="post" action={acaoResumo} className="mt-3">
              <button className="rounded-lg border border-app-border px-3 py-1.5 text-sm font-medium hover:bg-app-soft">Atualizar</button>
            </form>
          </>
        )}
      </Seccao>

      <Seccao titulo="Lead">
        <dl className="space-y-1.5">
          <Linha rotulo="Passo" valor={STEP_LABEL[lead.step]} />
          <Linha rotulo="Para" valor={lead.publico ? (lead.publico === "kids" ? "Filho/a (kids)" : "Adulto") : "—"} />
          <Linha rotulo="Modalidade" valor={lead.modalidade ? MODALIDADE_LABEL[lead.modalidade] : "—"} />
          <Linha rotulo="Espaço" valor={local ? `${local.nome}${local.morada ? ` — ${local.morada}` : ""}` : "—"} />
          <Linha rotulo="Aula" valor={lead.turma ? `${lead.turma} · ${lead.dias ?? ""} · ${lead.horario ?? ""}` : "—"} />
          <Linha rotulo="Como conheceu" valor={lead.origem ? (ORIGEM_LABEL[lead.origem] ?? lead.origem) : "—"} />
          {typeof lead.collected?.primeira_mensagem === "string" && <Linha rotulo="Primeira mensagem" valor={lead.collected.primeira_mensagem} />}
          {lead.human_reason && <Linha rotulo="Nota" valor={lead.human_reason} />}
        </dl>
      </Seccao>

      <Seccao titulo="Ações">
        <LeadActions phone={lead.phone} paused={lead.paused} />
      </Seccao>

      <Seccao titulo="Aluno">
        {lead.aluno_id ? (
          <Link href={`/painel/alunos/${lead.aluno_id}`} className="text-sm text-app-accent hover:underline">
            Ver aluno →
          </Link>
        ) : (
          <p className="text-sm text-app-muted">Ainda não é aluno. «Enviar inscrição» manda-lhe o formulário.</p>
        )}
      </Seccao>
    </aside>
  );
}
