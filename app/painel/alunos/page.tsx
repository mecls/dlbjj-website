import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { locais, localPorSlug } from "@/content/site";
import { FAIXA_LABEL, FAIXAS, descreverFaixa } from "@/lib/alunos/faixas";
import { listarAlunos } from "@/lib/alunos/listar";
import { Card } from "@/components/painel/ui";
import { EstadoAlunoBadge, diasDesde } from "@/components/painel/alunos-ui";

export const dynamic = "force-dynamic";

const ESTADOS = [
  ["", "Todos"],
  ["ativo", "Ativo"],
  ["inativo", "Inativo"],
  ["ex_aluno", "Ex-aluno"],
] as const;

export default async function AlunosPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  await requireAuth();
  const sp = (await searchParams) ?? {};
  const filtros = { academia: sp.academia || "", estado: sp.estado || "", faixa: sp.faixa || "", q: sp.q || "" };
  const alunos = await listarAlunos(filtros);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Alunos</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500">{alunos.length} alunos</span>
          <Link href="/painel/alunos/novo" className="rounded-lg bg-dl-red px-3 py-1.5 text-sm font-medium text-white hover:bg-dl-red-hover">
            Novo aluno
          </Link>
        </div>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
        <label className="grid gap-1">
          <span className="text-xs text-neutral-500">Academia</span>
          <select name="academia" defaultValue={filtros.academia} className="rounded-lg border border-neutral-300 px-2 py-1.5">
            <option value="">Todas</option>
            {locais.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-neutral-500">Estado</span>
          <select name="estado" defaultValue={filtros.estado} className="rounded-lg border border-neutral-300 px-2 py-1.5">
            {ESTADOS.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-neutral-500">Faixa</span>
          <select name="faixa" defaultValue={filtros.faixa} className="rounded-lg border border-neutral-300 px-2 py-1.5">
            <option value="">Todas</option>
            {FAIXAS.map((f) => (
              <option key={f} value={f}>
                {FAIXA_LABEL[f]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-neutral-500">Nome</span>
          <input name="q" defaultValue={filtros.q} placeholder="Procurar" className="rounded-lg border border-neutral-300 px-2 py-1.5" />
        </label>
        <button className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 hover:bg-neutral-50">Filtrar</button>
      </form>

      {alunos.length === 0 ? (
        <Card className="p-8 text-center text-sm text-neutral-400">
          Ainda não há alunos. Envia o formulário de inscrição a partir de uma lead, ou cria um aluno manualmente.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Academia</th>
                <th className="px-4 py-2">Faixa</th>
                <th className="px-4 py-2">Último check-in</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => (
                <tr key={a.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <Link href={`/painel/alunos/${a.id}`} className="font-medium text-neutral-900 hover:underline">
                      {a.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-600">{a.local_slug ? (localPorSlug(a.local_slug)?.nome ?? a.local_slug) : "—"}</td>
                  <td className="px-4 py-2 text-neutral-600">{descreverFaixa(a.faixa)}</td>
                  <td className="px-4 py-2 text-neutral-600">{a.ultimoCheckin ? diasDesde(a.ultimoCheckin) : "nunca"}</td>
                  <td className="px-4 py-2">
                    <EstadoAlunoBadge estado={a.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
