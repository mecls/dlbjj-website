import Link from "next/link";
import { locais, localPorSlug } from "@/content/site";
import { Aviso, BotaoLink, Button, Card, Input, Label, PageHeader, Rotulo, Select, Textarea } from "@/components/app/ui";
import { Icone } from "@/components/app/icones";
import { EventoModal } from "@/components/painel/evento-modal";
import { requireAuth } from "@/lib/auth";
import { mesAnterior, mesDeCalendario, mesSeguinte, mesValido, type CelulaCalendario } from "@/lib/aluno/estatisticas";
import { DIAS_CURTOS, MESES, diaCurto } from "@/lib/datas-pt";
import { eventoPorId, listarEventos, proximosEventos, type Evento } from "@/lib/eventos";
import { hojeLisboa, somarDias } from "@/lib/tempo";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function localNome(slug: string | null): string {
  return slug ? (localPorSlug(slug)?.nome ?? slug) : "Toda a academia";
}

function Formulario({ mes, evento, dia, action }: { mes: string; evento: Evento | null; dia: string; action: string }) {
  return (
    <form method="post" action={action} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="mes" value={mes} />
      <Label className="md:col-span-2">
        <Rotulo>Título</Rotulo>
        <Input name="titulo" required maxLength={80} defaultValue={evento?.titulo ?? ""} placeholder="Seminário, graduação, competição…" />
      </Label>
      <Label>
        <Rotulo>Dia</Rotulo>
        <Input name="dia" type="date" required defaultValue={evento?.dia ?? dia} />
      </Label>
      <Label>
        <Rotulo>Hora (opcional)</Rotulo>
        <Input name="hora" type="time" defaultValue={evento?.hora ?? ""} />
      </Label>
      <Label className="md:col-span-2">
        <Rotulo>Local</Rotulo>
        <Select name="local_slug" defaultValue={evento?.local_slug ?? ""}>
          <option value="">Toda a academia</option>
          {locais.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.nome}
            </option>
          ))}
        </Select>
      </Label>
      <Label className="md:col-span-2">
        <Rotulo>Descrição (opcional)</Rotulo>
        <Textarea name="descricao" rows={2} maxLength={500} defaultValue={evento?.descricao ?? ""} />
      </Label>
      <div className="md:col-span-2">
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
}

function Chips({ c, mes }: { c: CelulaCalendario; mes: string }) {
  return (
    <>
      {c.eventos.map((e) => (
        <Link key={e.id} href={`/painel/eventos?mes=${mes}&editar=${e.id}`} className="block truncate rounded border border-app-accent px-1.5 py-0.5 text-[11px] leading-4 text-app-accent hover:bg-red-50" title={e.titulo}>
          {e.hora ? `${e.hora} ` : ""}
          {e.titulo}
        </Link>
      ))}
    </>
  );
}

/** Eventos (ajustes §2.5): o calendário primeiro; criar, editar e cancelar numa janela sobre o mês. */
export default async function EventosPage({ searchParams }: { searchParams?: Promise<{ mes?: string; novo?: string; editar?: string; ok?: string; erro?: string }> }) {
  await requireAuth();
  const sp = (await searchParams) ?? {};
  const hoje = hojeLisboa();
  const mes = mesValido(sp.mes, hoje);
  const [y, m] = mes.split("-").map(Number);
  const primeiro = `${mes}-01`;
  const ultimo = somarDias(`${mesSeguinte(mes)}-01`, -1);
  const novo = sp.novo && /^\d{4}-\d{2}-\d{2}$/.test(sp.novo) ? sp.novo : null;
  const [eventos, proximos, aEditar] = await Promise.all([
    listarEventos(somarDias(primeiro, -7), somarDias(ultimo, 7)),
    proximosEventos(hoje, 10),
    sp.editar ? eventoPorId(sp.editar) : Promise.resolve(null),
  ]);
  const semanas = mesDeCalendario(mes, [], eventos, [], hoje);
  const dias = semanas.flat().filter((c) => c.noMes && (c.hoje || c.eventos.length > 0));
  const fechar = `/painel/eventos?mes=${mes}`;

  return (
    <div className="space-y-6">
      <PageHeader titulo="Eventos">
        <Link href={`/painel/eventos?mes=${mesAnterior(mes)}`} className="rounded-lg border border-app-border px-3 py-1.5 text-sm hover:bg-app-soft">{`‹ ${MESES[Number(mesAnterior(mes).slice(5)) - 1]}`}</Link>
        <Link href="/painel/eventos" className="rounded-lg border border-app-border px-3 py-1.5 text-sm hover:bg-app-soft">
          Hoje
        </Link>
        <Link href={`/painel/eventos?mes=${mesSeguinte(mes)}`} className="rounded-lg border border-app-border px-3 py-1.5 text-sm hover:bg-app-soft">{`${MESES[Number(mesSeguinte(mes).slice(5)) - 1]} ›`}</Link>
        <BotaoLink href={`/painel/eventos?mes=${mes}&novo=${hoje}`}>
          <Icone nome="eventos" className="size-4" />
          Novo evento
        </BotaoLink>
      </PageHeader>
      {sp.ok ? <Aviso>Guardado.</Aviso> : null}
      <h2 className="text-lg font-semibold">{`${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} de ${y}`}</h2>

      <Card className="hidden overflow-hidden lg:block">
        <div className="grid grid-cols-7 border-b border-app-border text-center text-[11px] font-medium uppercase tracking-wider text-app-muted">
          {DIAS_CURTOS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        {semanas.map((linha, i) => (
          <div key={i} className="grid grid-cols-7 border-b border-app-border last:border-b-0">
            {linha.map((c) => (
              <div key={c.dia} className={cn("min-h-24 space-y-0.5 border-r border-app-border p-1.5 last:border-r-0", !c.noMes && "bg-app-page text-app-muted")}>
                {c.noMes ? (
                  <Link href={`/painel/eventos?mes=${mes}&novo=${c.dia}`} className={cn("block rounded px-1 text-sm hover:bg-app-soft", c.hoje && "font-bold text-app-accent")} title="Novo evento neste dia">
                    {Number(c.dia.slice(8))}
                  </Link>
                ) : (
                  <span className="block px-1 text-sm">{Number(c.dia.slice(8))}</span>
                )}
                <Chips c={c} mes={mes} />
              </div>
            ))}
          </div>
        ))}
      </Card>

      <Card className="divide-y divide-app-border lg:hidden">
        {dias.length === 0 ? <p className="px-4 py-6 text-sm text-app-muted">Sem eventos neste mês.</p> : null}
        {dias.map((c) => (
          <div key={c.dia} className="flex gap-3 px-4 py-3">
            <Link href={`/painel/eventos?mes=${mes}&novo=${c.dia}`} className={cn("w-16 shrink-0 text-sm hover:underline", c.hoje && "font-bold text-app-accent")}>
              {diaCurto(c.dia)}
            </Link>
            <div className="min-w-0 flex-1 space-y-1">
              <Chips c={c} mes={mes} />
            </div>
          </div>
        ))}
      </Card>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Próximos</h2>
        {proximos.length === 0 ? (
          <p className="text-sm text-app-muted">Sem eventos marcados.</p>
        ) : (
          <Card className="divide-y divide-app-border">
            {proximos.map((e) => (
              <Link key={e.id} href={`/painel/eventos?mes=${e.dia.slice(0, 7)}&editar=${e.id}`} className="block px-4 py-2.5 text-sm hover:bg-app-soft">
                {[diaCurto(e.dia), e.hora ?? "—", e.titulo, localNome(e.local_slug)].join(" · ")}
                {e.descricao ? <span className="block text-app-muted">{e.descricao}</span> : null}
              </Link>
            ))}
          </Card>
        )}
      </section>

      {novo ? (
        <EventoModal titulo="Novo evento" fechar={fechar}>
          {sp.erro ? <Aviso tipo="erro">{sp.erro}</Aviso> : null}
          <div className={cn(sp.erro && "mt-3")}>
            <Formulario mes={mes} evento={null} dia={novo} action="/api/painel/eventos" />
          </div>
        </EventoModal>
      ) : aEditar ? (
        <EventoModal titulo={aEditar.cancelado_em ? "Evento cancelado" : "Editar evento"} fechar={fechar}>
          {aEditar.cancelado_em ? (
            <p className="text-sm text-app-muted">{`Este evento foi cancelado. ${[diaCurto(aEditar.dia), aEditar.hora ?? "", aEditar.titulo].filter(Boolean).join(" · ")}`}</p>
          ) : (
            <>
              {sp.erro ? <Aviso tipo="erro">{sp.erro}</Aviso> : null}
              <div className={cn(sp.erro && "mt-3")}>
                <Formulario mes={mes} evento={aEditar} dia={aEditar.dia} action={`/api/painel/eventos/${aEditar.id}`} />
              </div>
              <form method="post" action={`/api/painel/eventos/${aEditar.id}/cancelar`} className="mt-4 border-t border-app-border pt-4">
                <input type="hidden" name="mes" value={mes} />
                <button className="text-sm text-red-700 underline">Cancelar evento</button>
              </form>
            </>
          )}
        </EventoModal>
      ) : sp.editar ? (
        <EventoModal titulo="Evento" fechar={fechar}>
          <p className="text-sm text-app-muted">Evento não encontrado.</p>
        </EventoModal>
      ) : null}
    </div>
  );
}
