import Link from "next/link";
import { localPorSlug } from "@/content/site";
import { Card, PageHeader } from "@/components/app/ui";
import { turmasAtivas } from "@/lib/alunos/consultas";
import { turmasDoAluno } from "@/lib/bot/checkin";
import { presencasDoAluno } from "@/lib/aluno/dados";
import { mesAnterior, mesDeCalendario, mesSeguinte, mesValido, type CelulaCalendario } from "@/lib/aluno/estatisticas";
import { requireAluno } from "@/lib/aluno/sessao";
import { DIAS_CURTOS, MESES, diaCurto } from "@/lib/datas-pt";
import { listarEventos, proximosEventos } from "@/lib/eventos";
import { hojeLisboa, somarDias } from "@/lib/tempo";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function localNome(slug: string | null): string {
  return slug ? (localPorSlug(slug)?.nome ?? slug) : "Toda a academia";
}

function Chips({ c }: { c: CelulaCalendario }) {
  return (
    <>
      {c.aulas.map((a) => (
        <span key={a.id} className="block truncate rounded bg-app-soft px-1.5 py-0.5 text-[11px] leading-4 text-app-text">{`${a.horario} ${a.turma}`}</span>
      ))}
      {c.eventos.map((e) => (
        <span key={e.id} className="block truncate rounded border border-app-accent px-1.5 py-0.5 text-[11px] leading-4 text-app-accent" title={e.descricao ? `${e.titulo} — ${e.descricao}` : e.titulo}>
          {e.titulo}
        </span>
      ))}
    </>
  );
}

/** Calendário do aluno (design §5.5): as suas aulas, os eventos e as presenças, mês a mês. */
export default async function CalendarioAluno({ searchParams }: { searchParams?: Promise<{ mes?: string }> }) {
  const { aluno } = await requireAluno();
  const sp = (await searchParams) ?? {};
  const hoje = hojeLisboa();
  const mes = mesValido(sp.mes, hoje);
  const [y, m] = mes.split("-").map(Number);
  const primeiro = `${mes}-01`;
  const ultimo = somarDias(`${mesSeguinte(mes)}-01`, -1);
  const [turmas, eventos, presencas, proximos] = await Promise.all([turmasAtivas(), listarEventos(somarDias(primeiro, -7), somarDias(ultimo, 7)), presencasDoAluno(aluno.id, somarDias(primeiro, -7)), proximosEventos(hoje, 10)]);
  const semanas = mesDeCalendario(mes, turmasDoAluno(aluno, turmas), eventos, presencas, hoje);
  const dias = semanas.flat().filter((c) => c.noMes && (c.hoje || c.presente || c.aulas.length > 0 || c.eventos.length > 0));

  return (
    <div className="space-y-6">
      <PageHeader titulo="Calendário">
        <Link href={`/aluno/calendario?mes=${mesAnterior(mes)}`} className="rounded-lg border border-app-border px-3 py-1.5 text-sm hover:bg-app-soft">{`‹ ${MESES[Number(mesAnterior(mes).slice(5)) - 1]}`}</Link>
        <Link href="/aluno/calendario" className="rounded-lg border border-app-border px-3 py-1.5 text-sm hover:bg-app-soft">
          Hoje
        </Link>
        <Link href={`/aluno/calendario?mes=${mesSeguinte(mes)}`} className="rounded-lg border border-app-border px-3 py-1.5 text-sm hover:bg-app-soft">{`${MESES[Number(mesSeguinte(mes).slice(5)) - 1]} ›`}</Link>
      </PageHeader>
      <h2 className="text-lg font-semibold">{`${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} de ${y}`}</h2>

      {/* Grelha (ecrãs grandes) */}
      <Card className="hidden overflow-hidden lg:block">
        <div className="grid grid-cols-7 border-b border-app-border text-center text-[11px] font-medium uppercase tracking-wider text-app-muted">
          {DIAS_CURTOS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        {semanas.map((linha, i) => (
          <div key={i} className="grid grid-cols-7 border-b border-app-border last:border-b-0">
            {linha.map((c) => (
              <div key={c.dia} className={cn("min-h-24 space-y-0.5 border-r border-app-border p-1.5 last:border-r-0", !c.noMes && "bg-app-page text-app-muted")}>
                <div className="flex items-center justify-between">
                  <span className={cn("text-sm", c.hoje && "font-bold text-app-accent")}>{Number(c.dia.slice(8))}</span>
                  {c.presente ? <span title="Presença" className="size-1.5 rounded-full bg-app-accent" /> : null}
                </div>
                <Chips c={c} />
              </div>
            ))}
          </div>
        ))}
      </Card>

      {/* Lista (telemóvel) */}
      <Card className="divide-y divide-app-border lg:hidden">
        {dias.length === 0 ? <p className="px-4 py-6 text-sm text-app-muted">Sem aulas nem eventos neste mês.</p> : null}
        {dias.map((c) => (
          <div key={c.dia} className="flex gap-3 px-4 py-3">
            <div className={cn("w-16 shrink-0 text-sm", c.hoje && "font-bold text-app-accent")}>
              {diaCurto(c.dia)}
              {c.presente ? <span title="Presença" className="ml-1 inline-block size-1.5 rounded-full bg-app-accent align-middle" /> : null}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Chips c={c} />
              {c.aulas.length === 0 && c.eventos.length === 0 ? <span className="text-xs text-app-muted">—</span> : null}
            </div>
          </div>
        ))}
      </Card>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Próximos eventos</h2>
        {proximos.length === 0 ? (
          <p className="text-sm text-app-muted">Sem eventos marcados.</p>
        ) : (
          <Card className="divide-y divide-app-border">
            {proximos.map((e) => (
              <div key={e.id} className="px-4 py-2.5 text-sm">
                <p>{[diaCurto(e.dia), e.hora ?? "—", e.titulo, localNome(e.local_slug)].join(" · ")}</p>
                {e.descricao ? <p className="mt-0.5 text-app-muted">{e.descricao}</p> : null}
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
