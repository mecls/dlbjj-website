import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { localPorSlug } from "@/content/site";
import { listaDePresencas, turmaPorId, ultimoDiaDaTurma } from "@/lib/alunos/aulas";
import { Card } from "@/components/painel/ui";

export const dynamic = "force-dynamic";

export default async function AulaPage({ params, searchParams }: { params: Promise<{ turmaId: string }>; searchParams?: Promise<{ data?: string; erro?: string; ok?: string }> }) {
  await requireAuth();
  const { turmaId } = await params;
  const sp = (await searchParams) ?? {};
  const turma = await turmaPorId(turmaId);
  if (!turma) notFound();
  const data = /^\d{4}-\d{2}-\d{2}$/.test(sp.data ?? "") ? sp.data! : ultimoDiaDaTurma(turma);
  const lista = await listaDePresencas(turma, data);
  const presentes = lista.filter((a) => a.presente).length;

  return (
    <div className="space-y-4">
      <Link href="/painel/aulas" className="text-sm text-neutral-500 hover:underline">
        ← Aulas
      </Link>
      <h1 className="text-xl font-semibold">
        {turma.turma} · {localPorSlug(turma.local_slug)?.nome} · {turma.dias} {turma.horario.slice(0, 5)}
      </h1>
      {sp.erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Não guardou: {sp.erro}</p>}
      {sp.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Presenças guardadas.</p>}

      <form method="get" className="flex items-end gap-2 text-sm">
        <label className="grid gap-1">
          <span className="text-xs text-neutral-500">Dia</span>
          <input type="date" name="data" defaultValue={data} className="rounded-lg border border-neutral-300 px-2 py-1.5" />
        </label>
        <button className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5">Ver</button>
      </form>

      <Card className="p-5 text-sm">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">Presenças em {data}</h2>
          <span className="text-neutral-500">{presentes} / {lista.length}</span>
        </div>
        {lista.length === 0 ? (
          <p className="text-neutral-400">Não há alunos ativos nesta academia.</p>
        ) : (
          <form method="post" action={`/api/painel/aulas/${turma.id}/presencas`} className="grid gap-2">
            <input type="hidden" name="data" value={data} />
            {lista.map((a) => (
              <label key={a.id} className="flex items-center gap-2">
                <input type="checkbox" name="aluno_ids" value={a.id} defaultChecked={a.presente} disabled={a.presente} />
                <span className={a.presente ? "text-neutral-400" : ""}>{a.nome}</span>
                {a.presente && <span className="text-xs text-emerald-700">presente</span>}
              </label>
            ))}
            <button className="mt-2 w-fit rounded-lg bg-dl-red px-3 py-1.5 font-medium text-white hover:bg-dl-red-hover">Guardar presenças</button>
          </form>
        )}
      </Card>
    </div>
  );
}
