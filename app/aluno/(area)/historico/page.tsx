import Link from "next/link";
import { localPorSlug } from "@/content/site";
import { MapaDeCalor } from "@/components/app/heatmap";
import { Card, PageHeader } from "@/components/app/ui";
import { haPresencasAntesDe, presencasDoAluno, type PresencaAluno } from "@/lib/aluno/dados";
import { mapaDeCalor, mesAnterior } from "@/lib/aluno/estatisticas";
import { requireAluno } from "@/lib/aluno/sessao";
import { diaCurto, mesAno } from "@/lib/datas-pt";
import { hojeLisboa } from "@/lib/tempo";

export const dynamic = "force-dynamic";

function menosMeses(mes: string, n: number): string {
  let m = mes;
  for (let i = 0; i < n; i++) m = mesAnterior(m);
  return m;
}

/** Histórico do aluno (design §5.3): mapa de 6 meses e as presenças por mês, das mais recentes às mais antigas. */
export default async function HistoricoAluno({ searchParams }: { searchParams?: Promise<{ desde?: string }> }) {
  const { aluno } = await requireAluno();
  const sp = (await searchParams) ?? {};
  const hoje = hojeLisboa();
  const desde = sp.desde && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.desde) ? sp.desde : menosMeses(hoje.slice(0, 7), 11);
  const [presencas, haMaisAntigas] = await Promise.all([presencasDoAluno(aluno.id, `${desde}-01`), haPresencasAntesDe(aluno.id, `${desde}-01`)]);

  const porMes = new Map<string, PresencaAluno[]>();
  for (const p of presencas) (porMes.get(p.data.slice(0, 7)) ?? porMes.set(p.data.slice(0, 7), []).get(p.data.slice(0, 7))!).push(p);

  return (
    <div className="space-y-8">
      <PageHeader titulo="Histórico" />

      <Card className="overflow-x-auto p-6">
        <MapaDeCalor celulas={mapaDeCalor(presencas, hoje, 26)} />
        <p className="mt-3 text-sm text-app-muted">Últimos 6 meses</p>
      </Card>

      {presencas.length === 0 ? (
        <Card className="p-8 text-center text-sm text-app-muted">
          Ainda não tens presenças. Escreve <strong>presente</strong> no WhatsApp quando chegares à aula.
        </Card>
      ) : (
        <div className="space-y-6">
          {[...porMes.entries()].map(([mes, lista]) => (
            <section key={mes}>
              <h2 className="text-lg font-bold">{`${mesAno(mes)} · ${lista.length} ${lista.length === 1 ? "aula" : "aulas"}`}</h2>
              <Card className="mt-2 divide-y divide-app-border">
                {lista.map((p) => (
                  <p key={`${p.data}-${p.turma_id}`} className="px-4 py-2.5 text-sm">
                    {[diaCurto(p.data), p.dlbjj_turmas?.horario.slice(0, 5), p.dlbjj_turmas?.turma, p.dlbjj_turmas ? (localPorSlug(p.dlbjj_turmas.local_slug)?.nome ?? p.dlbjj_turmas.local_slug) : null].filter(Boolean).join(" · ")}
                  </p>
                ))}
              </Card>
            </section>
          ))}
          {haMaisAntigas ? (
            <p>
              <Link href={`/aluno/historico?desde=${menosMeses(desde, 12)}`} className="text-sm text-app-muted underline hover:text-app-text">
                Ver mais antigas
              </Link>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
