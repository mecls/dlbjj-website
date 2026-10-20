import Link from "next/link";
import { localPorSlug } from "@/content/site";
import { Icone } from "@/components/app/icones";
import { Card, PageHeader } from "@/components/painel/ui";
import { SeletorPeriodo } from "@/components/painel/seletor-periodo";
import { periodoDe } from "@/lib/aulas/periodo";
import { hojeLisboa } from "@/lib/tempo";
import { requireAuth } from "@/lib/auth";
import { resumoPorEspaco } from "@/lib/aulas/espacos";

export const dynamic = "force-dynamic";

/** Aulas (ajustes §2.4): um cartão por espaço; dentro, o horário semanal. */
export default async function AulasPage({ searchParams }: { searchParams?: Promise<{ dias?: string; desde?: string; ate?: string }> }) {
  await requireAuth();
  const periodo = periodoDe((await searchParams) ?? {}, hojeLisboa());
  const { espacos, ranking } = await resumoPorEspaco(periodo);
  const top = ranking[0];
  const total = ranking.reduce((s, t) => s + t.presencas, 0);

  return (
    <div className="space-y-6">
      <PageHeader titulo="Aulas">
        <SeletorPeriodo base="/painel/aulas" periodo={periodo} />
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {espacos.map((e) => (
          <Link key={e.slug} href={`/painel/aulas/espaco/${e.slug}?${periodo.query}`} className="block">
            <Card className="h-full p-6 transition hover:border-app-icon/40">
              <div className="flex items-center gap-3">
                <Icone nome="aulas" className="size-7 text-app-icon" />
                <p className="text-xl font-bold">{e.nome}</p>
              </div>
              <p className="mt-1 text-sm text-app-muted">{e.morada ?? "—"}</p>
              <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                {[
                  [e.turmas, "turmas"],
                  [e.presencas, `presenças (${periodo.rotulo})`],
                  [e.alunosAtivos, "alunos ativos"],
                ].map(([n, r]) => (
                  <div key={String(r)}>
                    <dt className="text-2xl font-bold leading-none">{n}</dt>
                    <dd className="mt-1 text-xs text-app-muted">{r}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </Link>
        ))}
      </div>

      {total === 0 ? (
        <p className="text-sm text-app-muted">Ainda não há presenças registadas.</p>
      ) : top && top.presencas > 0 ? (
        <p className="text-sm">
          <span className="text-app-muted">Turma mais concorrida: </span>
          <Link href={`/painel/aulas/${top.id}`} className="font-medium hover:underline">
            {`${top.turma} · ${localPorSlug(top.local_slug)?.nome ?? top.local_slug} · ${top.dias} ${top.horario.slice(0, 5)}`}
          </Link>
          <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">a aula com mais alunos</span>
        </p>
      ) : null}
    </div>
  );
}
