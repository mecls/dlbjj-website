import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, MapPin, Navigation, Phone } from "lucide-react";
import { CtaFinal } from "@/components/CtaFinal";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { Nav } from "@/components/Nav";
import { Botao } from "@/components/ui/Botao";
import { WhatsAppFlutuante } from "@/components/WhatsAppFlutuante";
import {
  contactos,
  locais,
  programas,
  whatsappUrl,
  type Aula,
  type Local,
} from "@/content/site";
import { locationJsonLd } from "@/lib/schema";
import { cn } from "@/lib/utils";

const etiquetas: Record<Aula["tipo"], { label: string; classe: string }> = {
  kids: { label: "Kids", classe: "bg-dl-red/15 text-dl-red" },
  "jiu-jitsu": { label: "Jiu-Jitsu", classe: "bg-dl-bone/10 text-dl-bone" },
  mma: { label: "MMA", classe: "bg-dl-red/15 text-dl-red" },
  misto: { label: "Misto", classe: "bg-dl-bone/10 text-dl-bone" },
};

export function LocalPagina({ local }: { local: Local }) {
  const h1 = local.seoTitulo.split(" — ")[0];
  const programasAqui = programas.filter((p) => local.programas.includes(p.id));
  const outrosLocais = locais.filter((l) => l.slug !== local.slug);

  return (
    <>
      <JsonLd data={locationJsonLd(local)} />
      <Nav />

      <main id="conteudo" className="flex-1">
        {/* Cabeçalho */}
        <section className="bg-dl-ink relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-20">
          <div aria-hidden className="textura-tijolo absolute inset-0 opacity-[0.04]" />
          <div className="container-dl relative">
            <Link
              href="/#locais"
              className="text-dl-ash hover:text-dl-red inline-flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Todos os locais
            </Link>

            <p className="eyebrow mt-8">Academia DL-BJJ</p>
            <h1 className="h-display text-dl-bone mt-3 max-w-4xl text-4xl sm:text-6xl lg:text-7xl">
              {h1}
            </h1>

            {local.morada && (
              <p className="text-dl-ash mt-5 flex items-start gap-2.5 text-base sm:text-lg">
                <MapPin className="text-dl-red mt-1 h-5 w-5 shrink-0" />
                {local.morada}
              </p>
            )}

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Botao href={whatsappUrl} externo tamanho="lg">
                Marcar aula grátis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Botao>
              <a
                href={`tel:${contactos.telefoneDigitos}`}
                className="font-display inline-flex h-14 items-center justify-center gap-2.5 rounded-sm border-2 border-white/25 px-8 text-base font-bold tracking-[0.1em] text-white uppercase transition-colors hover:border-white hover:bg-white/5"
              >
                <Phone className="h-4 w-4" />
                {contactos.telefone}
              </a>
            </div>
          </div>
        </section>

        {/* Horários */}
        <section className="bg-dl-black">
          <div className="container-dl py-16 sm:py-24">
            <p className="eyebrow">Horários</p>
            <h2 className="h-display text-dl-bone mt-4 text-4xl sm:text-5xl">
              Aulas em {local.nome}
            </h2>

            <ul className="border-dl-coal mt-10 divide-y divide-white/5 border-y">
              {local.aulas.map((aula, i) => {
                const etiqueta = etiquetas[aula.tipo];
                return (
                  <li
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <span
                        className={cn(
                          "font-display inline-block shrink-0 rounded-sm px-2.5 py-1 text-xs font-bold tracking-[0.1em] uppercase",
                          etiqueta.classe,
                        )}
                      >
                        {etiqueta.label}
                      </span>
                      <span className="text-dl-bone font-semibold">{aula.turma}</span>
                    </div>
                    <div className="text-dl-ash flex items-center gap-4 text-sm">
                      <span>{aula.dias}</span>
                      <span className="text-dl-bone inline-flex items-center gap-2 font-medium tabular-nums">
                        <Clock className="text-dl-red h-4 w-4" />
                        {aula.horario}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Mapa */}
        {local.mapsEmbed && (
          <section className="bg-dl-ink">
            <div className="container-dl py-16 sm:py-24">
              <div className="grid items-center gap-10 lg:grid-cols-2">
                <div className="border-dl-coal bg-dl-void relative aspect-4/3 overflow-hidden rounded-sm border">
                  <iframe
                    src={local.mapsEmbed}
                    title={`Mapa — ${local.nome}`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0 h-full w-full grayscale-[0.4]"
                    allowFullScreen
                  />
                </div>
                <div>
                  <p className="eyebrow">Onde estamos</p>
                  <h2 className="h-display text-dl-bone mt-4 text-4xl sm:text-5xl">
                    Como chegar
                  </h2>
                  {local.morada && (
                    <p className="text-dl-ash mt-5 flex items-start gap-2.5 text-base">
                      <MapPin className="text-dl-red mt-0.5 h-5 w-5 shrink-0" />
                      {local.morada}
                    </p>
                  )}
                  <div className="mt-8 flex flex-wrap gap-3">
                    {local.mapsUrl && (
                      <a
                        href={local.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group border-dl-coal text-dl-bone font-display hover:border-dl-red inline-flex h-11 items-center gap-2 rounded-sm border px-5 text-sm font-bold tracking-[0.1em] uppercase transition-colors"
                      >
                        <Navigation className="text-dl-red h-4 w-4" />
                        Como chegar
                      </a>
                    )}
                    <a
                      href={`tel:${contactos.telefoneDigitos}`}
                      className="group border-dl-coal text-dl-bone font-display hover:border-dl-red inline-flex h-11 items-center gap-2 rounded-sm border px-5 text-sm font-bold tracking-[0.1em] uppercase transition-colors"
                    >
                      <Phone className="text-dl-red h-4 w-4" />
                      {contactos.telefone}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Programas neste local + outros locais */}
        <section className="bg-dl-black">
          <div className="container-dl py-16 sm:py-24">
            {programasAqui.length > 0 && (
              <>
                <p className="eyebrow">Programas aqui</p>
                <h2 className="h-display text-dl-bone mt-4 text-4xl sm:text-5xl">
                  O que se treina em {local.nome}
                </h2>
                <ul className="mt-8 flex flex-wrap gap-3">
                  {programasAqui.map((p) => (
                    <li key={p.id}>
                      <Link
                        href="/#programas"
                        className="border-dl-coal bg-dl-ink text-dl-bone font-display hover:border-dl-red inline-flex items-center rounded-sm border px-5 py-3 text-sm font-bold tracking-[0.1em] uppercase transition-colors"
                      >
                        {p.nome}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="border-dl-coal mt-14 border-t pt-10">
              <p className="text-dl-ash text-sm">
                A academia tem mais tatames. Veja os outros locais:
              </p>
              <ul className="mt-4 flex flex-wrap gap-3">
                {outrosLocais.map((l) => (
                  <li key={l.slug}>
                    <Link
                      href={`/${l.slug}`}
                      className="group text-dl-red font-display inline-flex items-center gap-2 text-sm font-bold tracking-[0.1em] uppercase transition-colors hover:text-white"
                    >
                      {l.nome}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <CtaFinal />
      </main>

      <Footer />
      <WhatsAppFlutuante />
    </>
  );
}
