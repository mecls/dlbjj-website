import { requireAuth } from "@/lib/auth";
import { serviceClient } from "@/lib/supabase/service";
import { hojeLisboa } from "@/lib/tempo";
import { Card } from "@/components/painel/ui";
import { timeAgo } from "@/components/painel/ui";

export const dynamic = "force-dynamic";

/** A restrição do WhatsApp ainda em curso (ou null). Fora do componente: o render fica puro. */
function restricaoEmCurso(ate: string | null | undefined): Date | null {
  if (!ate) return null;
  const d = new Date(ate);
  return d.getTime() > Date.now() ? d : null;
}

export default async function AgentePage({ searchParams }: { searchParams?: Promise<{ ok?: string }> }) {
  await requireAuth();
  const { ok } = (await searchParams) ?? {};
  const db = serviceClient();
  const [{ data: ligado }, { data: sessao }, { data: orc }, { data: desconhecidos }, { data: falhadas }] = await Promise.all([
    db.from("dlbjj_settings").select("value").eq("key", "bot_enabled").maybeSingle(),
    db.from("dlbjj_sessao").select("*").eq("id", 1).maybeSingle(),
    db.from("dlbjj_orcamento_envio").select("proativas,respostas,recebidas").eq("dia", hojeLisboa()).maybeSingle(),
    db.from("dlbjj_fila_saida").select("id,phone,kind,corpo,erro,updated_at").eq("estado", "desconhecido").order("updated_at", { ascending: false }).limit(20),
    db.from("dlbjj_entradas_falhadas").select("id,delivery_id,payload,tentativas,erro,created_at").is("resolvida_em", null).gt("tentativas", 3).order("created_at", { ascending: false }).limit(20),
  ]);
  const botLigado = ligado?.value !== "off";
  const restricao = restricaoEmCurso(sessao?.restricao_ate);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Agente</h1>
      {ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Guardado.</p>}

      <Card className="flex items-center justify-between p-5">
        <div>
          <h2 className="font-semibold">Interruptor do bot</h2>
          <p className="text-sm text-neutral-500">
            {botLigado ? "Ligado — o bot responde e faz os toques de reativação." : "Desligado — nada sai; o que estava em fila é cancelado. As mensagens do Daniel pelo painel continuam a sair."}
          </p>
        </div>
        <form method="post" action="/api/painel/agente/interruptor">
          <input type="hidden" name="estado" value={botLigado ? "off" : "on"} />
          <button className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${botLigado ? "bg-emerald-600 hover:bg-emerald-700" : "bg-neutral-500 hover:bg-neutral-600"}`}>
            {botLigado ? "Ligado" : "Desligado"}
          </button>
        </form>
      </Card>

      {!sessao ? (
        <Card className="p-5 text-sm text-neutral-500">O worker ainda não reportou. Segue o runbook em docker/README.md.</Card>
      ) : sessao.estado === "caido" ? (
        <Card className="border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <h2 className="font-semibold">Sessão WhatsApp em baixo{sessao.detalhe ? `: ${sessao.detalhe}` : ""}</h2>
          <p className="mt-1">visto há {timeAgo(sessao.visto_em).replace(/^há /, "")} · runbook: docker/README.md, passo 4</p>
        </Card>
      ) : (
        <Card className={`p-5 text-sm ${sessao.estado === "instavel" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          <h2 className="font-semibold">{sessao.estado === "instavel" ? "Sessão instável" : "Sessão ligada"} · {sessao.telefone ?? "—"}</h2>
          <p className="mt-1">
            visto há {timeAgo(sessao.visto_em).replace(/^há /, "")} · enviadas hoje {(orc?.proativas ?? 0) + (orc?.respostas ?? 0)} · recebidas hoje {orc?.recebidas ?? 0}
          </p>
          {sessao.detalhe && <p className="mt-1">{sessao.detalhe}</p>}
          {restricao && <p className="mt-1 font-medium">O WhatsApp pediu para abrandar; envios proativos em pausa até {restricao.toLocaleTimeString("pt-PT", { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit" })}.</p>}
        </Card>
      )}

      {(desconhecidos ?? []).length > 0 && (
        <Card className="p-5 text-sm">
          <h2 className="font-semibold text-red-700">Envios desconhecidos</h2>
          <p className="mb-2 text-neutral-500">O gateway não respondeu a tempo. Podem ter chegado ou não; nunca são repetidos sozinhos. Confirma no telemóvel e, se faltar, responde pelo painel.</p>
          <ul className="space-y-1">
            {(desconhecidos ?? []).map((d) => (
              <li key={d.id} className="flex justify-between gap-3">
                <span className="truncate">{d.phone} · {d.corpo.slice(0, 60)}</span>
                <span className="shrink-0 text-neutral-500">{d.erro} · {timeAgo(d.updated_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(falhadas ?? []).length > 0 && (
        <Card className="p-5 text-sm">
          <h2 className="font-semibold text-red-700">Mensagens recebidas por processar</h2>
          <p className="mb-2 text-neutral-500">A app não aceitou estas entregas depois de 4 tentativas. A pessoa escreveu e não teve resposta.</p>
          <ul className="space-y-1">
            {(falhadas ?? []).map((f) => (
              <li key={f.id} className="flex justify-between gap-3">
                <span className="truncate">{String((f.payload as { from?: string }).from ?? "?")} · {String((f.payload as { text?: string }).text ?? "").slice(0, 60)}</span>
                <span className="shrink-0 text-neutral-500">{f.erro} · {timeAgo(f.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
