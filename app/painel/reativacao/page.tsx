import { requireAuth } from "@/lib/auth";
import { serviceClient } from "@/lib/supabase/service";
import { emAtraso } from "@/lib/reativacao/executar";
import { hojeLisboa } from "@/lib/tempo";
import { Card } from "@/components/painel/ui";
import { dataPt } from "@/components/painel/alunos-ui";

export const dynamic = "force-dynamic";

const ESTADO_TOQUE: Record<string, string> = { na_fila: "na fila", enviada: "enviada", falhou: "falhou", saltada: "saltada" };

export default async function ReativacaoPage({ searchParams }: { searchParams?: Promise<{ ok?: string; erro?: string }> }) {
  await requireAuth();
  const { ok, erro } = (await searchParams) ?? {};
  const db = serviceClient();
  const [devidos, { data: orc }, { data: tecto }, { data: toques }, { data: optOuts }] = await Promise.all([
    emAtraso(),
    db.from("dlbjj_orcamento_envio").select("proativas").eq("dia", hojeLisboa()).maybeSingle(),
    db.from("dlbjj_settings").select("value").eq("key", "proativas_por_dia").maybeSingle(),
    db.from("dlbjj_toques").select("id,phone,regra,estado,enviada_em,respondeu_em,created_at,lead_id,aluno_id").order("created_at", { ascending: false }).limit(50),
    db.from("dlbjj_opt_outs").select("phone_hash,created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  const nomes = new Map<string, string>();
  const ids = (toques ?? []).map((t) => t.lead_id).filter(Boolean) as string[];
  const aids = (toques ?? []).map((t) => t.aluno_id).filter(Boolean) as string[];
  if (ids.length) for (const l of (await db.from("dlbjj_leads").select("id,name").in("id", ids)).data ?? []) nomes.set(l.id, l.name ?? "");
  if (aids.length) for (const a of (await db.from("dlbjj_alunos").select("id,nome").in("id", aids)).data ?? []) nomes.set(a.id, a.nome);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[28px] font-bold tracking-tight text-app-text">Reativação</h1>
        <span className="text-sm text-app-muted">{`Enviadas hoje: ${orc?.proativas ?? 0} / ${tecto?.value ?? 10}`}</span>
      </div>
      {ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Feito.</p>}
      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <Card className="p-5 text-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Em atraso agora</h2>
          <form method="post" action="/api/painel/reativacao/correr">
            <button className="rounded-lg bg-dl-red px-3 py-1.5 font-medium text-white hover:bg-dl-red-hover">Correr regras agora</button>
          </form>
        </div>
        {devidos.length === 0 ? (
          <p className="text-app-muted">Ninguém está em atraso. As regras correm de hora a hora.</p>
        ) : (
          <table className="w-full">
            <tbody>
              {devidos.map((d) => (
                <tr key={`${d.phone}-${d.regra}`} className="border-t border-app-border">
                  <td className="py-2 font-medium">{d.nome || d.phone}</td>
                  <td className="py-2 text-app-muted">{d.regra}</td>
                  <td className="py-2 text-app-muted">{d.corpo.slice(0, 60)}…</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <form method="post" action="/api/painel/reativacao/enviar">
                        <input type="hidden" name="phone" value={d.phone} />
                        <input type="hidden" name="regra" value={d.regra} />
                        <button className="rounded-lg border border-app-border bg-white px-2 py-1 hover:bg-app-soft">Enviar agora</button>
                      </form>
                      <form method="post" action="/api/painel/reativacao/saltar">
                        <input type="hidden" name="phone" value={d.phone} />
                        <input type="hidden" name="regra" value={d.regra} />
                        <button className="rounded-lg border border-app-border bg-white px-2 py-1 hover:bg-app-soft">Saltar</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-5 text-sm">
        <h2 className="mb-3 font-semibold">Toques</h2>
        {(toques ?? []).length === 0 ? (
          <p className="text-app-muted">Ainda não saiu nenhum toque.</p>
        ) : (
          <table className="w-full">
            <thead className="text-left text-xs uppercase tracking-wide text-app-muted">
              <tr>
                <th className="py-1">Quem</th>
                <th className="py-1">Regra</th>
                <th className="py-1">Estado</th>
                <th className="py-1">Enviada</th>
                <th className="py-1">Respondeu</th>
              </tr>
            </thead>
            <tbody>
              {(toques ?? []).map((t) => (
                <tr key={t.id} className="border-t border-app-border">
                  <td className="py-1">{nomes.get(t.aluno_id ?? "") || nomes.get(t.lead_id ?? "") || t.phone}</td>
                  <td className="py-1 text-app-muted">{t.regra}</td>
                  <td className="py-1">{ESTADO_TOQUE[t.estado] ?? t.estado}</td>
                  <td className="py-1 text-app-muted">{t.enviada_em ? dataPt(t.enviada_em) : "—"}</td>
                  <td className="py-1 text-app-muted">{t.respondeu_em ? `respondeu a ${t.regra}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-5 text-sm">
        <h2 className="mb-3 font-semibold">Opt-outs ({(optOuts ?? []).length})</h2>
        <p className="mb-2 text-app-muted">Só o início do hash e a data: estes números nunca mais recebem proativas.</p>
        <ul className="space-y-1 font-mono text-xs text-app-muted">
          {(optOuts ?? []).map((o) => (
            <li key={o.phone_hash}>
              opt-out {o.phone_hash.slice(0, 10)}… · {dataPt(o.created_at)}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
