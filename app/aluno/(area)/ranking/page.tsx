import Link from "next/link";
import { Faixa } from "@/components/app/faixa";
import { ScrollPara } from "@/components/app/scroll-para";
import { Card, PageHeader, Pill } from "@/components/app/ui";
import { descreverFaixa } from "@/lib/alunos/faixas";
import { rankingAlunos } from "@/lib/aluno/dados";
import { ordenarRanking } from "@/lib/aluno/estatisticas";
import { requireAluno } from "@/lib/aluno/sessao";
import { cn } from "@/lib/utils";
import { hojeLisboa } from "@/lib/tempo";

export const dynamic = "force-dynamic";

/** Ranking da academia (design §5.4): primeiros nomes, faixa, aulas no período; a própria em destaque. */
export default async function RankingAluno({ searchParams }: { searchParams?: Promise<{ periodo?: string }> }) {
  const { aluno } = await requireAluno();
  const sp = (await searchParams) ?? {};
  const periodo = sp.periodo === "sempre" ? "sempre" : "mes";
  const linhas = ordenarRanking(await rankingAlunos(periodo, hojeLisboa()));
  const eu = linhas.find((l) => l.alunoId === aluno.id);

  return (
    <div className="space-y-6">
      <PageHeader titulo="Ranking">
        <nav className="flex gap-1 rounded-lg border border-app-border p-1 text-sm">
          {[
            ["mes", "Este mês"],
            ["sempre", "Desde sempre"],
          ].map(([v, label]) => (
            <Link key={v} href={`/aluno/ranking?periodo=${v}`} className={cn("rounded-md px-3 py-1.5", periodo === v ? "bg-app-soft font-medium" : "text-app-muted hover:text-app-text")}>
              {label}
            </Link>
          ))}
        </nav>
      </PageHeader>

      <p className="text-[15px] text-app-muted">{eu ? `Estás em ${eu.posicao}.º de ${linhas.length}` : "Não apareces no ranking."}</p>

      <Card>
        <ol className="divide-y divide-app-border">
          {linhas.map((l) => {
            const sou = l.alunoId === aluno.id;
            return (
              <li key={l.alunoId} id={sou ? "eu" : undefined} data-eu={sou ? "" : undefined} className={cn("flex items-center gap-4 px-4 py-3", sou && "bg-app-soft")}>
                <span className="w-8 shrink-0 text-right text-[15px] font-bold tabular-nums">{l.posicao}.º</span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{l.nomeCurto}</span>
                {l.faixa ? (
                  <span className="hidden items-center gap-2 sm:flex">
                    <Faixa faixa={l.faixa.faixa} graus={l.faixa.graus} className="h-4 w-auto" />
                    <Pill>{descreverFaixa(l.faixa)}</Pill>
                  </span>
                ) : (
                  <Pill className="hidden sm:inline-flex">Sem faixa</Pill>
                )}
                <span className="w-20 shrink-0 text-right text-sm text-app-muted tabular-nums">{`${l.n} ${l.n === 1 ? "aula" : "aulas"}`}</span>
              </li>
            );
          })}
        </ol>
      </Card>
      {eu ? <ScrollPara id="eu" /> : null}
    </div>
  );
}
