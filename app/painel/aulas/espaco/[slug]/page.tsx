import Link from "next/link";
import { notFound } from "next/navigation";
import { localPorSlug } from "@/content/site";
import { Card, PageHeader } from "@/components/painel/ui";
import { requireAuth } from "@/lib/auth";
import { rankingAulasEntre, type LinhaRanking } from "@/lib/alunos/aulas";
import { periodoDe } from "@/lib/aulas/periodo";
import { SeletorPeriodo } from "@/components/painel/seletor-periodo";
import { grelhaSemanal } from "@/lib/aulas/grelha";
import { NOME_DIA, hojeLisboa } from "@/lib/tempo";

export const dynamic = "force-dynamic";

function Bloco({ t }: { t: LinhaRanking }) {
  return (
    <Link href={`/painel/aulas/${t.id}`} className="block rounded-lg border border-app-border bg-app-soft px-2.5 py-2 text-xs hover:border-app-icon/40">
      <p className="font-semibold text-app-text">{t.turma}</p>
      <p className="text-app-muted">{t.horario.slice(0, 5)}</p>
      <p className="text-app-muted">{`${t.presencas} presenças · ${t.alunos} alunos`}</p>
    </Link>
  );
}

/** O horário semanal de um espaço (ajustes §2.4): horas em baixo, dias ao lado, um bloco por turma. */
export default async function EspacoPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<{ dias?: string; desde?: string; ate?: string }> }) {
  await requireAuth();
  const { slug } = await params;
  const local = localPorSlug(slug);
  if (!local) notFound();
  const periodo = periodoDe((await searchParams) ?? {}, hojeLisboa());
  const turmas = (await rankingAulasEntre(periodo.desde, periodo.ate)).filter((t) => t.local_slug === slug);
  const g = grelhaSemanal(turmas);

  return (
    <div className="space-y-6">
      <Link href={`/painel/aulas?${periodo.query}`} className="text-sm text-app-muted hover:underline">
        ← Aulas
      </Link>
      <PageHeader titulo={local.nome}>
        <SeletorPeriodo base={`/painel/aulas/espaco/${slug}`} periodo={periodo} />
      </PageHeader>
      <p className="text-sm text-app-muted">{`Presenças: ${periodo.rotulo}`}</p>

      {turmas.length === 0 ? (
        <Card className="p-8 text-center text-sm text-app-muted">Sem turmas ativas neste espaço.</Card>
      ) : (
        <>
          <Card className="hidden overflow-x-auto lg:block">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-app-border text-[11px] font-medium uppercase tracking-wider text-app-muted">
                  <th className="w-20 px-3 py-2 text-left">Hora</th>
                  {g.dias.map((d) => (
                    <th key={d} className="px-3 py-2 text-left">
                      {NOME_DIA[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.horas.map((h) => (
                  <tr key={h} className="border-b border-app-border align-top last:border-b-0">
                    <td className="px-3 py-3 font-medium tabular-nums">{h}</td>
                    {g.dias.map((d) => (
                      <td key={d} className="space-y-1.5 px-2 py-2">
                        {(g.celulas[`${d}|${h}`] ?? []).map((t) => (
                          <Bloco key={t.id} t={t} />
                        ))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="space-y-4 lg:hidden">
            {g.dias.map((d) => (
              <Card key={d} className="p-4">
                <h2 className="mb-2 font-semibold capitalize">{NOME_DIA[d]}</h2>
                <div className="space-y-1.5">
                  {g.horas.flatMap((h) => (g.celulas[`${d}|${h}`] ?? []).map((t) => <Bloco key={`${t.id}-${h}`} t={t} />))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
