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
        <h1 className="text-[28px] font-bold tracking-tight text-app-text">Alunos</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-app-muted">{alunos.length} alunos</span>
          <Link href="/painel/alunos/novo" className="rounded-lg bg-dl-red px-3 py-1.5 text-sm font-medium text-white hover:bg-dl-red-hover">
            Novo aluno
          </Link>
        </div>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
        <label className="grid gap-1">
          <span className="text-xs text-app-muted">Academia</span>
          <select name="academia" defaultValue={filtros.academia} className="rounded-lg border border-app-border px-2 py-1.5">
            <option value="">Todas</option>
            {locais.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-app-muted">Estado</span>
          <select name="estado" defaultValue={filtros.estado} className="rounded-lg border border-app-border px-2 py-1.5">
            {ESTADOS.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-app-muted">Faixa</span>
          <select name="faixa" defaultValue={filtros.faixa} className="rounded-lg border border-app-border px-2 py-1.5">
            <option value="">Todas</option>
            {FAIXAS.map((f) => (
              <option key={f} value={f}>
                {FAIXA_LABEL[f]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-app-muted">Nome</span>
          <input name="q" defaultValue={filtros.q} placeholder="Procurar" className="rounded-lg border border-app-border px-2 py-1.5" />
        </label>
        <button className="rounded-lg border border-app-border bg-white px-3 py-1.5 hover:bg-app-soft">Filtrar</button>
      </form>

      {alunos.length === 0 ? (
        <Card className="p-8 text-center text-sm text-app-muted">
          Ainda não há alunos. Envia o formulário de inscrição a partir de uma lead, ou cria um aluno manualmente.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-app-page text-left text-xs uppercase tracking-wide text-app-muted">
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
                <tr key={a.id} className="border-t border-app-border hover:bg-app-soft">
                  <td className="px-4 py-2">
                    <Link href={`/painel/alunos/${a.id}`} className="font-medium text-app-text hover:underline">
                      {a.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-app-muted">{a.local_slug ? (localPorSlug(a.local_slug)?.nome ?? a.local_slug) : "—"}</td>
                  <td className="px-4 py-2 text-app-muted">{descreverFaixa(a.faixa)}</td>
                  <td className="px-4 py-2 text-app-muted">{a.ultimoCheckin ? diasDesde(a.ultimoCheckin) : "nunca"}</td>
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
