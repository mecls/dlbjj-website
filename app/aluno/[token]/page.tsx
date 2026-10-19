import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { localPorSlug } from "@/content/site";
import { alunoPublicoPorId, faixaAtualDe, presencasDe, turmasAtivas } from "@/lib/alunos/consultas";
import { descreverFaixa } from "@/lib/alunos/faixas";
import { MODALIDADE_LABEL } from "@/lib/bot/flow";
import { proximasAulas } from "@/lib/bot/checkin";
import { hojeLisboa, somarDias } from "@/lib/tempo";
import { verificarToken } from "@/lib/tokens-db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "A minha ficha — Academia DL-BJJ",
  robots: { index: false, follow: false },
};

function dataPt(iso: string): string {
  const [y, m, d] = iso.split("-");
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${Number(d)} de ${meses[Number(m) - 1]} de ${y}`;
}

/**
 * Ficha do aluno por link mágico (spec §3 F, §4). Só o que o aluno pode ver:
 * nome, academia, modalidade, faixa, início, presenças recentes, próximas
 * aulas. Nada de saúde, encarregado ou contactos. O proxy.ts já validou o
 * token (e devolveu 410/404 se não servia); aqui valida-se outra vez por
 * defesa em profundidade.
 */
export default async function FichaAluno({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { avaliacao, row } = await verificarToken(token, "perfil");
  if (!avaliacao.ok || !row?.aluno_id) notFound();

  const aluno = await alunoPublicoPorId(row.aluno_id);
  if (!aluno || aluno.estado === "anonimizado") notFound();

  const hoje = hojeLisboa();
  const [faixa, presencas, turmas] = await Promise.all([
    faixaAtualDe(aluno.id),
    presencasDe(aluno.id, somarDias(hoje, -30)),
    turmasAtivas(),
  ]);
  const proximas = proximasAulas(aluno, turmas, new Date(), 3);
  const local = aluno.local_slug ? localPorSlug(aluno.local_slug) : undefined;
  const ultima = presencas[0];

  return (
    <main className="mx-auto max-w-md px-4 py-10 text-neutral-900">
      <p className="text-xs font-bold tracking-widest text-dl-red">DL-BJJ</p>
      <h1 className="mt-1 text-2xl font-semibold">{aluno.nome}</h1>
      <p className="text-sm text-neutral-500">
        {local?.nome ?? "—"} · {aluno.modalidade ? MODALIDADE_LABEL[aluno.modalidade] : "—"}
      </p>

      <dl className="mt-6 space-y-3 rounded-xl border border-neutral-200 bg-white p-5 text-sm shadow-sm">
        <Linha rotulo="Faixa">
          {descreverFaixa(faixa)}
          {faixa && (
            <span className="text-neutral-400">
              {" "}
              · desde <time dateTime={faixa.atribuida_em}>{dataPt(faixa.atribuida_em)}</time>
            </span>
          )}
        </Linha>
        <Linha rotulo="Treina connosco desde">
          {aluno.inicio_em ? <time dateTime={aluno.inicio_em}>{dataPt(aluno.inicio_em)}</time> : "—"}
        </Linha>
        <Linha rotulo="Presenças (30 dias)">{presencas.length}</Linha>
        <Linha rotulo="Último check-in">
          {ultima ? (
            <>
              <time dateTime={ultima.data}>{dataPt(ultima.data)}</time>
              {ultima.dlbjj_turmas ? ` · ${ultima.dlbjj_turmas.turma} ${ultima.dlbjj_turmas.horario.slice(0, 5)}` : ""}
            </>
          ) : (
            "Sem presenças nos últimos 30 dias."
          )}
        </Linha>
      </dl>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-500">Próximas aulas</h2>
      {proximas.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">Sem aulas marcadas para os próximos dias.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {proximas.map((p) => (
            <li key={`${p.id}-${p.dia}`} className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
              <span className="capitalize">{p.diaNome}</span> <time dateTime={p.dia}>{dataPt(p.dia)}</time> às {p.horario} · {p.turma}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs text-neutral-400">
        Para registares uma presença, escreve <strong>presente</strong> no WhatsApp da academia. Este link é pessoal e expira em 7 dias.
      </p>
    </main>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-40 shrink-0 text-neutral-400">{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}
