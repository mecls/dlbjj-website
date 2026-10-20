import Link from "next/link";
import { notFound } from "next/navigation";
import { localPorSlug } from "@/content/site";
import { Card, PageHeader } from "@/components/painel/ui";
import { requireAuth } from "@/lib/auth";
import { rankingAulas, type LinhaRanking } from "@/lib/alunos/aulas";
import { grelhaSemanal } from "@/lib/aulas/grelha";
import { NOME_DIA } from "@/lib/tempo";
import { cn } from "@/lib/utils";

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
export default async function EspacoPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<{ dias?: string }> }) {
  await requireAuth();
  const { slug } = await params;
  const local = localPorSlug(slug);
  if (!local) notFound();
  const { dias } = (await searchParams) ?? {};
  const periodo = dias === "90" ? 90 : 30;
  const turmas = (await rankingAulas(periodo)).filter((t) => t.local_slug === slug);
  const g = grelhaSemanal(turmas);

  return (
    <div className="space-y-6">
      <Link href={`/painel/aulas?dias=${periodo}`} className="text-sm text-app-muted hover:underline">
        ← Aulas
      </Link>
      <PageHeader titulo={local.nome}>
        <div className="flex gap-1 rounded-lg border border-app-border p-1 text-sm">
          {[30, 90].map((d) => (
            <Link key={d} href={`/painel/aulas/espaco/${slug}?dias=${d}`} className={cn("rounded-md px-3 py-1.5", periodo === d ? "bg-app-soft font-medium" : "text-app-muted hover:text-app-text")}>
              {d} dias
            </Link>
          ))}
        </div>
      </PageHeader>

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
