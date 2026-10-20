import Link from "next/link";
import { locais, localPorSlug } from "@/content/site";
import { Aviso, Button, Card, Input, Label, PageHeader, Rotulo, Select, Tabela, Td, Textarea, Th, Tr } from "@/components/app/ui";
import { requireAuth } from "@/lib/auth";
import { diaCurto } from "@/lib/datas-pt";
import { eventoPorId, eventosDoPainel, type Evento } from "@/lib/eventos";
import { hojeLisboa } from "@/lib/tempo";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function localNome(slug: string | null): string {
  return slug ? (localPorSlug(slug)?.nome ?? slug) : "Toda a academia";
}

function Lista({ titulo, eventos, vazio }: { titulo: string; eventos: Evento[]; vazio: string }) {
  return (
    <Card>
      <h2 className="border-b border-app-border px-4 py-3 font-semibold">{titulo}</h2>
      {eventos.length === 0 ? (
        <p className="px-4 py-6 text-sm text-app-muted">{vazio}</p>
      ) : (
        <Tabela>
          <thead>
            <tr>
              <Th>Dia</Th>
              <Th>Hora</Th>
              <Th>Evento</Th>
              <Th>Local</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((e) => (
              <Tr key={e.id} className={cn(e.cancelado_em && "text-app-muted")}>
                <Td className="whitespace-nowrap">{diaCurto(e.dia)}</Td>
                <Td>{e.hora ?? "—"}</Td>
                <Td>
                  <span className={cn("font-medium", e.cancelado_em && "line-through")}>{e.titulo}</span>
                  {e.cancelado_em ? <span className="ml-2 text-xs">cancelado</span> : null}
                  {e.descricao ? <p className="text-xs text-app-muted">{e.descricao}</p> : null}
                </Td>
                <Td>{localNome(e.local_slug)}</Td>
                <Td className="text-right">
                  {e.cancelado_em ? null : (
                    <div className="flex justify-end gap-2">
                      <Link href={`/painel/eventos?editar=${e.id}`} className="text-sm underline hover:text-app-text">
                        Editar
                      </Link>
                      <form method="post" action={`/api/painel/eventos/${e.id}/cancelar`}>
                        <button className="text-sm text-red-700 underline">Cancelar</button>
                      </form>
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Tabela>
      )}
    </Card>
  );
}

/** Eventos (design §6): criar, editar, cancelar; os alunos veem-nos no calendário. */
export default async function EventosPage({ searchParams }: { searchParams?: Promise<{ ok?: string; erro?: string; editar?: string }> }) {
  await requireAuth();
  const { ok, erro, editar } = (await searchParams) ?? {};
  const hoje = hojeLisboa();
  const [{ proximos, passados }, aEditar] = await Promise.all([eventosDoPainel(hoje), editar ? eventoPorId(editar) : Promise.resolve(null)]);

  return (
    <div className="space-y-6">
      <PageHeader titulo="Eventos" />
      {ok ? <Aviso>Guardado.</Aviso> : null}
      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

      <Card className="p-5">
        <h2 className="font-semibold">{aEditar ? "Editar evento" : "Novo evento"}</h2>
        <form method="post" action={aEditar ? `/api/painel/eventos/${aEditar.id}` : "/api/painel/eventos"} className="mt-3 grid gap-3 md:grid-cols-2">
          <Label className="md:col-span-2">
            <Rotulo>Título</Rotulo>
            <Input name="titulo" required maxLength={80} defaultValue={aEditar?.titulo ?? ""} placeholder="Seminário, graduação, competição…" />
          </Label>
          <Label>
            <Rotulo>Dia</Rotulo>
            <Input name="dia" type="date" required defaultValue={aEditar?.dia ?? hoje} />
          </Label>
          <Label>
            <Rotulo>Hora (opcional)</Rotulo>
            <Input name="hora" type="time" defaultValue={aEditar?.hora ?? ""} />
          </Label>
          <Label>
            <Rotulo>Local</Rotulo>
            <Select name="local_slug" defaultValue={aEditar?.local_slug ?? ""}>
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
            <Textarea name="descricao" rows={2} maxLength={500} defaultValue={aEditar?.descricao ?? ""} />
          </Label>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit">Guardar</Button>
            {aEditar ? (
              <Link href="/painel/eventos" className="inline-flex items-center rounded-lg px-4 py-2 text-sm text-app-muted hover:text-app-text">
                Desistir
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      <Lista titulo="Próximos" eventos={proximos} vazio="Sem eventos marcados." />
      <Lista titulo="Passados (90 dias)" eventos={passados} vazio="Nada nos últimos 90 dias." />
    </div>
  );
}
