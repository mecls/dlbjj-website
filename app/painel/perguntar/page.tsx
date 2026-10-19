import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { serviceClient } from "@/lib/supabase/service";
import { Card } from "@/components/painel/ui";

export const dynamic = "force-dynamic";

const EXEMPLOS = [
  "quantos alunos ativos temos em Queluz?",
  "mostra-me a ficha da Ana",
  "qual é a aula com mais alunos?",
  "quem está em risco?",
  "leads por origem nos últimos 30 dias",
];

export default async function PerguntarPage({ searchParams }: { searchParams?: Promise<{ q?: string; erro?: string }> }) {
  await requireAuth();
  const { q, erro } = (await searchParams) ?? {};
  const { data } = await serviceClient().from("dlbjj_perguntas").select("id,pergunta,resposta,ferramenta,linhas,created_at").order("created_at", { ascending: false }).limit(20);
  const historico = (data ?? []).reverse();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Perguntar</h1>
      <p className="text-sm text-neutral-500">Responde só com o que está na base de dados. Nunca inventa números nem datas.</p>
      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <div className="flex flex-wrap gap-2 text-xs">
        {EXEMPLOS.map((e) => (
          <Link key={e} href={`/painel/perguntar?q=${encodeURIComponent(e)}`} className="rounded-full border border-neutral-300 bg-white px-3 py-1 hover:bg-neutral-50">
            {e}
          </Link>
        ))}
      </div>

      <Card className="flex min-h-[20rem] flex-col">
        <div className="flex-1 space-y-3 p-4">
          {historico.length === 0 && <p className="py-8 text-center text-sm text-neutral-400">Faz uma pergunta ou escolhe um exemplo.</p>}
          {historico.map((h) => (
            <div key={h.id} className="space-y-1">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl bg-neutral-900 px-3 py-2 text-sm text-white">{h.pergunta}</div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl bg-neutral-100 px-3 py-2 text-sm text-neutral-900">
                  <p className="whitespace-pre-wrap">{h.resposta}</p>
                  <p className="mt-1 text-[10px] text-neutral-400">{h.ferramenta ? `ferramenta: ${h.ferramenta} · ${h.linhas} ${h.linhas === 1 ? "linha" : "linhas"}` : "sem ferramenta"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <form method="post" action="/api/painel/perguntar" className="flex items-center gap-2 border-t border-neutral-100 p-3">
          <input name="pergunta" defaultValue={q ?? ""} maxLength={500} required placeholder="Pergunta ao painel…" className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-dl-red px-3 py-2 text-sm font-medium text-white hover:bg-dl-red-hover">Perguntar</button>
        </form>
      </Card>
    </div>
  );
}
