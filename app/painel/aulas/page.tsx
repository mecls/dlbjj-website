import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { localPorSlug } from "@/content/site";
import { rankingAulas } from "@/lib/alunos/aulas";
import { Card } from "@/components/painel/ui";

export const dynamic = "force-dynamic";

export default async function AulasPage({ searchParams }: { searchParams?: Promise<{ dias?: string }> }) {
  await requireAuth();
  const { dias } = (await searchParams) ?? {};
  const periodo = dias === "90" ? 90 : 30;
  const ranking = await rankingAulas(periodo);
  const total = ranking.reduce((s, t) => s + t.presencas, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[28px] font-bold tracking-tight text-app-text">Aulas</h1>
        <div className="flex gap-2 text-sm">
          {[30, 90].map((d) => (
            <Link key={d} href={`/painel/aulas?dias=${d}`} className={`rounded-lg px-3 py-1 ${periodo === d ? "bg-app-soft font-medium text-app-text" : "border border-app-border bg-white"}`}>
              {d} dias
            </Link>
          ))}
        </div>
      </div>
      {total === 0 && <p className="text-sm text-app-muted">Ainda não há presenças registadas.</p>}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-app-page text-left text-xs uppercase tracking-wide text-app-muted">
            <tr>
              <th className="px-4 py-2">Turma</th>
              <th className="px-4 py-2">Local</th>
              <th className="px-4 py-2">Dias</th>
              <th className="px-4 py-2">Hora</th>
              <th className="px-4 py-2 text-right">Presenças</th>
              <th className="px-4 py-2 text-right">Alunos</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((t, i) => (
              <tr key={t.id} className="border-t border-app-border hover:bg-app-soft">
                <td className="px-4 py-2">
                  <Link href={`/painel/aulas/${t.id}`} className="font-medium hover:underline">
                    {t.turma}
                  </Link>
                  {i === 0 && t.presencas > 0 && (
                    <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">a aula com mais alunos</span>
                  )}
                </td>
                <td className="px-4 py-2 text-app-muted">{localPorSlug(t.local_slug)?.nome ?? t.local_slug}</td>
                <td className="px-4 py-2 text-app-muted">{t.dias}</td>
                <td className="px-4 py-2 text-app-muted">{t.horario.slice(0, 5)}</td>
                <td className="px-4 py-2 text-right">{t.presencas}</td>
                <td className="px-4 py-2 text-right">{t.alunos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
