import Image from "next/image";
import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { Revelar } from "@/components/ui/Revelar";
import { contactos, locais } from "@/content/site";

export function Locais() {
  return (
    <section id="locais" className="bg-dl-ink relative py-24 sm:py-32">
      <div className="container-dl">
        <Revelar className="max-w-2xl">
          <p className="eyebrow">Onde estamos</p>
          <h2 className="h-display text-dl-bone mt-4 text-5xl sm:text-6xl">
            Dois tatames, uma família
          </h2>
          <p className="text-dl-ash mt-5 text-base leading-relaxed sm:text-lg">
            Apareça sem marcação ou avise-nos antes — quem chega é sempre bem
            recebido.
          </p>
        </Revelar>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {locais.map((local, i) => (
            <Revelar key={local.id} atraso={i * 0.1} className="h-full">
              <article className="border-dl-coal bg-dl-black flex h-full flex-col overflow-hidden rounded-sm border">
                {/* Mapa ou foto */}
                <div className="bg-dl-void relative aspect-16/9 w-full">
                  {local.mapsEmbed ? (
                    <iframe
                      src={local.mapsEmbed}
                      title={`Mapa — ${local.nome}`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="absolute inset-0 h-full w-full grayscale-[0.4]"
                      allowFullScreen
                    />
                  ) : local.foto ? (
                    <Image
                      src={local.foto}
                      alt={`Academia DL-BJJ em ${local.nome}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="textura-tijolo absolute inset-0 flex items-center justify-center opacity-90">
                      <div className="bg-dl-ink/85 rounded-sm px-5 py-4 text-center backdrop-blur-sm">
                        <MapPin className="text-dl-red mx-auto h-6 w-6" />
                        <p className="font-display text-dl-red mt-2 text-xs font-bold tracking-[0.2em] uppercase">
                          Falta o mapa
                        </p>
                        <p className="text-dl-ash mt-1.5 max-w-[15rem] text-xs">
                          Google Maps › Partilhar › Incorporar um mapa →{" "}
                          <code className="text-dl-bone">mapsEmbed</code>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Detalhes */}
                <div className="relative flex flex-1 flex-col p-7">
                  <div className="bg-dl-red absolute top-0 left-7 h-1 w-12 -translate-y-1/2" />
                  <h3 className="h-display text-dl-bone text-3xl">{local.nome}</h3>

                  {local.morada ? (
                    <p className="text-dl-ash mt-3 flex items-start gap-2.5 text-sm">
                      <MapPin className="text-dl-red mt-0.5 h-4 w-4 shrink-0" />
                      {local.morada}
                    </p>
                  ) : (
                    <p className="border-dl-red/40 bg-dl-red/5 text-dl-ash mt-3 border-l-2 py-2 pl-3 text-xs">
                      <strong className="text-dl-bone">Falta a morada.</strong>{" "}
                      Rua, número e código postal →{" "}
                      <code className="text-dl-bone">content/site.ts</code>
                    </p>
                  )}

                  {/* Resumo dos horários */}
                  <ul className="mt-5 flex-1 space-y-2">
                    {local.aulas.map((aula, j) => (
                      <li
                        key={j}
                        className="text-dl-ash flex items-start gap-2.5 text-sm"
                      >
                        <Clock className="text-dl-steel mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          <span className="text-dl-bone">{aula.turma}</span>
                          <span className="text-dl-steel"> · {aula.dias} · </span>
                          <span className="tabular-nums">{aula.horario}</span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Ações */}
                  <div className="border-dl-coal mt-6 flex flex-wrap gap-3 border-t pt-6">
                    {local.mapsUrl && (
                      <a
                        href={local.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group border-dl-coal text-dl-bone font-display hover:border-dl-red inline-flex h-10 items-center gap-2 rounded-sm border px-4 text-xs font-bold tracking-[0.1em] uppercase transition-colors"
                      >
                        <Navigation className="text-dl-red h-3.5 w-3.5" />
                        Como chegar
                      </a>
                    )}
                    <a
                      href={`tel:${contactos.telefoneDigitos}`}
                      className="group border-dl-coal text-dl-bone font-display hover:border-dl-red inline-flex h-10 items-center gap-2 rounded-sm border px-4 text-xs font-bold tracking-[0.1em] uppercase transition-colors"
                    >
                      <Phone className="text-dl-red h-3.5 w-3.5" />
                      {contactos.telefone}
                    </a>
                  </div>
                </div>
              </article>
            </Revelar>
          ))}
        </div>
      </div>
    </section>
  );
}
