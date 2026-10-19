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
        <h1 className="text-xl font-semibold">Aulas</h1>
        <div className="flex gap-2 text-sm">
          {[30, 90].map((d) => (
            <Link key={d} href={`/painel/aulas?dias=${d}`} className={`rounded-lg px-3 py-1 ${periodo === d ? "bg-neutral-900 text-white" : "border border-neutral-300 bg-white"}`}>
              {d} dias
            </Link>
          ))}
        </div>
      </div>
      {total === 0 && <p className="text-sm text-neutral-500">Ainda não há presenças registadas.</p>}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
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
              <tr key={t.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <Link href={`/painel/aulas/${t.id}`} className="font-medium hover:underline">
                    {t.turma}
                  </Link>
                  {i === 0 && t.presencas > 0 && (
                    <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">a aula com mais alunos</span>
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-600">{localPorSlug(t.local_slug)?.nome ?? t.local_slug}</td>
                <td className="px-4 py-2 text-neutral-600">{t.dias}</td>
                <td className="px-4 py-2 text-neutral-600">{t.horario.slice(0, 5)}</td>
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
