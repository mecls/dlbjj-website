import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { locais, localPorSlug } from "@/content/site";
import { graduacoesDe, presencasDe, turmasAtivas } from "@/lib/alunos/consultas";
import { FAIXA_LABEL, FAIXAS, descreverFaixa, faixaAtual } from "@/lib/alunos/faixas";
import { alunoCompleto } from "@/lib/alunos/listar";
import { MODALIDADE_LABEL } from "@/lib/bot/flow";
import { hojeLisboa, somarDias } from "@/lib/tempo";
import { Card } from "@/components/painel/ui";
import { EstadoAlunoBadge, dataPt } from "@/components/painel/alunos-ui";

export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  duplicada: "Essa presença já estava registada.",
  confirmacao: "Para anonimizar, escreve exatamente ANONIMIZAR.",
  invalido: "Dados inválidos.",
};

export default async function AlunoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ erro?: string; ok?: string }> }) {
  await requireAuth();
  const { id } = await params;
  const { erro, ok } = (await searchParams) ?? {};
  const a = await alunoCompleto(id);
  if (!a) notFound();

  const [grads, presencas, turmas] = await Promise.all([graduacoesDe(id), presencasDe(id, somarDias(hojeLisboa(), -90)), turmasAtivas()]);
  const faixa = faixaAtual(grads);
  const local = typeof a.local_slug === "string" ? localPorSlug(a.local_slug) : undefined;
  const s = (k: string) => (typeof a[k] === "string" && a[k] ? (a[k] as string) : "—");
  const acao = `/api/painel/alunos/${id}`;
  const anonimizado = a.estado === "anonimizado";
  const turmasDoLocal = turmas.filter((t) => t.local_slug === a.local_slug);

  return (
    <div className="space-y-4">
      <Link href="/painel/alunos" className="text-sm text-app-muted hover:underline">
        ← Alunos
      </Link>
      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{ERROS[erro] ?? erro}</p>}
      {ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Guardado.</p>}

      <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
        <Card className="h-fit p-5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{a.nome}</h1>
            <EstadoAlunoBadge estado={a.estado} />
          </div>
          <p className="text-sm text-app-muted">
            {a.phone} ·{" "}
            <Link href={`/painel/${a.phone}`} className="hover:underline">
              conversa
            </Link>
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <L r="Faixa" v={descreverFaixa(faixa)} />
            <L r="Academia" v={local?.nome ?? s("local_slug")} />
            <L r="Modalidade" v={typeof a.modalidade === "string" ? MODALIDADE_LABEL[a.modalidade as keyof typeof MODALIDADE_LABEL] : "—"} />
            <L r="Para" v={a.publico === "kids" ? "Criança" : a.publico === "adulto" ? "Adulto" : "—"} />
            <L r="Início" v={dataPt(a.inicio_em as string)} />
            <L r="Nascimento" v={dataPt(a.data_nascimento as string)} />
            <L r="Email" v={s("email")} />
            <L r="Morada" v={s("morada")} />
            <L r="NIF" v={s("nif")} />
            <L r="Experiência" v={s("experiencia_previa")} />
            <L r="Notas" v={s("notas")} />
          </dl>
          {!anonimizado && (
            <>
              <h2 className="mt-5 text-xs font-semibold uppercase tracking-wide text-app-muted">Encarregado de educação</h2>
              <dl className="mt-2 space-y-2 text-sm">
                <L r="Nome" v={s("enc_nome")} />
                <L r="Telemóvel" v={s("enc_telefone")} />
                <L r="Relação" v={s("enc_relacao")} />
              </dl>
              <h2 className="mt-5 text-xs font-semibold uppercase tracking-wide text-app-muted">Saúde e emergência</h2>
              <dl className="mt-2 space-y-2 text-sm">
                <L r="Contacto" v={`${s("contacto_emergencia_nome")} ${s("contacto_emergencia_telefone")}`} />
                <L r="Condições" v={s("condicoes_saude")} />
                <L r="RGPD" v={a.consentimento_rgpd_em ? `consentiu em ${dataPt(a.consentimento_rgpd_em as string)}` : "sem consentimento"} />
                <L r="Imagem" v={a.consentimento_imagem ? "autoriza" : "não autoriza"} />
              </dl>
            </>
          )}
        </Card>

        <div className="space-y-4">
          {!anonimizado && (
            <Card className="space-y-4 p-5 text-sm">
              <form method="post" action={`${acao}/graduacao`} className="grid gap-2">
                <h2 className="font-semibold">Registar graduação</h2>
                <div className="flex flex-wrap gap-2">
                  <select name="faixa" className="rounded-lg border border-app-border px-2 py-1.5" defaultValue={faixa?.faixa ?? "branca"}>
                    {FAIXAS.map((f) => (
                      <option key={f} value={f}>
                        {FAIXA_LABEL[f]}
                      </option>
                    ))}
                  </select>
                  <select name="graus" className="rounded-lg border border-app-border px-2 py-1.5" defaultValue="0">
                    {[0, 1, 2, 3, 4].map((g) => (
                      <option key={g} value={g}>
                        {g} graus
                      </option>
                    ))}
                  </select>
                  <input name="atribuida_em" type="date" required defaultValue={hojeLisboa()} className="rounded-lg border border-app-border px-2 py-1.5" />
                </div>
                <input name="nota" placeholder="Nota (opcional)" className="rounded-lg border border-app-border px-2 py-1.5" />
                <button className="rounded-lg bg-dl-red px-3 py-1.5 font-medium text-white hover:bg-dl-red-hover">Registar</button>
              </form>

              <form method="post" action={`${acao}/presenca`} className="grid gap-2 border-t border-app-border pt-4">
                <h2 className="font-semibold">Marcar presença</h2>
                <div className="flex flex-wrap gap-2">
                  <select name="turma_id" className="rounded-lg border border-app-border px-2 py-1.5" defaultValue={(a.turma_preferida as string) ?? ""}>
                    {(turmasDoLocal.length ? turmasDoLocal : turmas).map((t) => (
                      <option key={t.id} value={t.id}>
                        {localPorSlug(t.local_slug)?.nome} · {t.turma} · {t.dias} {t.horario.slice(0, 5)}
                      </option>
                    ))}
                  </select>
                  <input name="data" type="date" required defaultValue={hojeLisboa()} className="rounded-lg border border-app-border px-2 py-1.5" />
                </div>
                <button className="rounded-lg border border-app-border bg-white px-3 py-1.5 font-medium hover:bg-app-soft">Marcar</button>
              </form>

              <div className="flex flex-wrap gap-2 border-t border-app-border pt-4">
                <form method="post" action={`${acao}/perfil-link`}>
                  <button className="rounded-lg border border-app-border bg-white px-3 py-1.5 font-medium hover:bg-app-soft">Enviar link do perfil</button>
                </form>
                <form method="post" action={`${acao}/ranking`} className="flex items-center gap-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="visivel" value="1" defaultChecked={a.ranking_visivel !== false} />
                    Aparece no ranking
                  </label>
                  <button className="rounded-lg border border-app-border bg-white px-3 py-1.5 font-medium hover:bg-app-soft">Guardar</button>
                </form>
                {a.estado !== "ativo" && (
                  <form method="post" action={`${acao}/estado`}>
                    <input type="hidden" name="estado" value="ativo" />
                    <button className="rounded-lg border border-app-border bg-white px-3 py-1.5 font-medium hover:bg-app-soft">Marcar ativo</button>
                  </form>
                )}
                {a.estado !== "inativo" && (
                  <form method="post" action={`${acao}/estado`}>
                    <input type="hidden" name="estado" value="inativo" />
                    <button className="rounded-lg border border-app-border bg-white px-3 py-1.5 font-medium hover:bg-app-soft">Marcar inativo</button>
                  </form>
                )}
                {a.estado !== "ex_aluno" && (
                  <form method="post" action={`${acao}/estado`}>
                    <input type="hidden" name="estado" value="ex_aluno" />
                    <button className="rounded-lg border border-app-border bg-white px-3 py-1.5 font-medium hover:bg-app-soft">Marcar ex-aluno</button>
                  </form>
                )}
              </div>

              <details className="border-t border-app-border pt-4">
                <summary className="cursor-pointer font-semibold">Editar ficha</summary>
                <form method="post" action={`${acao}/editar`} className="mt-3 grid gap-2">
                  {[
                    ["nome", "Nome"],
                    ["email", "Email"],
                    ["morada", "Morada"],
                    ["nif", "NIF"],
                    ["inicio_em", "Início (AAAA-MM-DD)"],
                    ["enc_nome", "Encarregado — nome"],
                    ["enc_telefone", "Encarregado — telemóvel"],
                    ["enc_relacao", "Encarregado — relação"],
                    ["contacto_emergencia_nome", "Emergência — nome"],
                    ["contacto_emergencia_telefone", "Emergência — telemóvel"],
                  ].map(([k, r]) => (
                    <label key={k} className="grid gap-1">
                      <span className="text-xs text-app-muted">{r}</span>
                      <input name={k} defaultValue={typeof a[k] === "string" ? (a[k] as string) : ""} className="rounded-lg border border-app-border px-2 py-1.5" />
                    </label>
                  ))}
                  <label className="grid gap-1">
                    <span className="text-xs text-app-muted">Academia</span>
                    <select name="local_slug" defaultValue={(a.local_slug as string) ?? ""} className="rounded-lg border border-app-border px-2 py-1.5">
                      {locais.map((l) => (
                        <option key={l.slug} value={l.slug}>
                          {l.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-app-muted">Condições de saúde</span>
                    <textarea name="condicoes_saude" rows={2} defaultValue={s("condicoes_saude") === "—" ? "" : s("condicoes_saude")} className="rounded-lg border border-app-border px-2 py-1.5" />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-app-muted">Notas</span>
                    <textarea name="notas" rows={2} defaultValue={s("notas") === "—" ? "" : s("notas")} className="rounded-lg border border-app-border px-2 py-1.5" />
                  </label>
                  <button className="rounded-lg bg-dl-red px-3 py-1.5 font-medium text-white hover:bg-dl-red-hover">Guardar</button>
                </form>
              </details>

              <details className="border-t border-app-border pt-4">
                <summary className="cursor-pointer font-semibold text-red-700">Anonimizar</summary>
                <form method="post" action={`${acao}/anonimizar`} className="mt-3 grid gap-2">
                  <p className="text-app-muted">Substitui o nome, telemóvel e todos os dados pessoais. As faixas e presenças ficam. Não se desfaz.</p>
                  <input name="confirmacao" placeholder="Escreve ANONIMIZAR" className="rounded-lg border border-app-border px-2 py-1.5" />
                  <button className="rounded-lg bg-red-700 px-3 py-1.5 font-medium text-white hover:bg-red-800">Anonimizar</button>
                </form>
              </details>
            </Card>
          )}

          <Card className="p-5 text-sm">
            <h2 className="font-semibold">Histórico de faixas</h2>
            {grads.length === 0 ? (
              <p className="mt-2 text-app-muted">Sem graduações registadas.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {grads.map((g) => (
                  <li key={g.id} className="flex justify-between">
                    <span>{descreverFaixa(g)}</span>
                    <span className="text-app-muted">
                      {dataPt(g.atribuida_em)}
                      {g.nota ? ` · ${g.nota}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5 text-sm">
            <h2 className="font-semibold">Presenças (90 dias): {presencas.length}</h2>
            {presencas.length === 0 ? (
              <p className="mt-2 text-app-muted">Sem presenças registadas.</p>
            ) : (
              <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                {presencas.map((p, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{dataPt(p.data)}</span>
                    <span className="text-app-muted">
                      {p.dlbjj_turmas ? `${p.dlbjj_turmas.turma} ${p.dlbjj_turmas.horario.slice(0, 5)}` : ""} · {p.origem}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function L({ r, v }: { r: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-app-muted">{r}</dt>
      <dd className="text-app-text">{v}</dd>
    </div>
  );
}
