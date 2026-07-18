import Image from "next/image";
import { Award, Quote } from "lucide-react";
import { Revelar } from "@/components/ui/Revelar";
import { marca, professor, sobre } from "@/content/site";

export function Sobre() {
  const temBio = professor.bio.length > 0;

  return (
    <section id="academia" className="bg-dl-ink relative overflow-hidden py-24 sm:py-32">
      {/* Monograma gigante em marca de água */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-24 hidden opacity-[0.03] lg:block"
      >
        <Image
          src="/brand/logo.png"
          alt=""
          width={620}
          height={620}
          className="object-contain"
        />
      </div>

      <div className="container-dl relative">
        <div className="grid items-start gap-16 lg:grid-cols-2 lg:gap-20">
          {/* Coluna de texto */}
          <Revelar>
            <p className="eyebrow">{sobre.etiqueta}</p>
            <h2 className="h-display text-dl-bone mt-4 text-5xl sm:text-6xl">
              {sobre.titulo}
            </h2>

            <div className="mt-8 space-y-5">
              {sobre.paragrafos.map((p, i) => (
                <p key={i} className="text-dl-ash text-base leading-relaxed sm:text-lg">
                  {p}
                </p>
              ))}
            </div>

            <p className="h-display text-dl-red mt-8 text-2xl">
              {sobre.assinatura}
            </p>

            {/* Valores em cartões */}
            <ul className="mt-10 grid grid-cols-3 gap-3">
              {marca.valores.map((valor) => (
                <li
                  key={valor}
                  className="border-dl-coal bg-dl-black/60 hover:border-dl-red/50 rounded-sm border p-4 text-center transition-colors"
                >
                  <span className="h-display text-dl-bone text-lg">{valor}</span>
                </li>
              ))}
            </ul>
          </Revelar>

          {/* Coluna do professor */}
          <Revelar atraso={0.15}>
            <div className="border-dl-coal bg-dl-black/60 relative overflow-hidden rounded-sm border">
              {/* Foto (ou marcador para foto real) */}
              <div className="bg-dl-void relative aspect-[4/5] w-full">
                {professor.foto ? (
                  <Image
                    src={professor.foto}
                    alt={`${professor.nome}, fundador da ${marca.nome}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="textura-tijolo absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-90">
                    <div className="bg-dl-ink/80 rounded-sm px-6 py-5 text-center backdrop-blur-sm">
                      <p className="font-display text-dl-red text-sm font-bold tracking-[0.2em] uppercase">
                        Falta a foto
                      </p>
                      <p className="text-dl-ash mt-2 max-w-[16rem] text-sm">
                        Retrato do {professor.nome} (vertical, 1200×1600).
                        <br />
                        Guardar em{" "}
                        <code className="text-dl-bone text-xs">
                          public/fotos/daniel-lopes.jpg
                        </code>
                      </p>
                    </div>
                  </div>
                )}
                <div className="from-dl-black absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
              </div>

              {/* Identificação */}
              <div className="relative p-7">
                <div className="bg-dl-red absolute top-0 left-7 h-1 w-14 -translate-y-1/2" />
                <p className="eyebrow">Fundador &amp; Professor</p>
                <h3 className="h-display text-dl-bone mt-2 text-3xl">
                  {professor.nome}
                </h3>

                {professor.graduacao && (
                  <p className="text-dl-ash mt-2 flex items-center gap-2 text-sm">
                    <Award className="text-dl-red h-4 w-4" />
                    {professor.graduacao}
                  </p>
                )}

                {professor.linhagem && (
                  <p className="text-dl-steel mt-1 text-sm">{professor.linhagem}</p>
                )}

                {temBio && (
                  <div className="mt-5 space-y-3">
                    {professor.bio.map((p, i) => (
                      <p key={i} className="text-dl-ash text-sm leading-relaxed">
                        {p}
                      </p>
                    ))}
                  </div>
                )}

                {professor.titulos.length > 0 && (
                  <ul className="mt-5 space-y-1.5">
                    {professor.titulos.map((t) => (
                      <li
                        key={t}
                        className="text-dl-ash flex items-start gap-2 text-sm"
                      >
                        <Award className="text-dl-red mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Lema */}
                <blockquote className="border-dl-coal mt-6 border-t pt-6">
                  <Quote className="text-dl-red h-5 w-5" />
                  <p className="text-dl-bone mt-2 text-sm leading-relaxed italic">
                    {marca.lema}
                  </p>
                </blockquote>
              </div>
            </div>
          </Revelar>
        </div>
      </div>
    </section>
  );
}
