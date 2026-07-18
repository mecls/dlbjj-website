import { Star } from "lucide-react";
import { IconeGoogle } from "@/components/ui/IconesMarcas";
import { Revelar } from "@/components/ui/Revelar";
import { provaSocial, testemunhos } from "@/content/site";

/** Iniciais do autor, para o avatar. */
function iniciais(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function Testemunhos() {
  return (
    <section className="bg-dl-black relative overflow-hidden py-24 sm:py-32">
      <div
        aria-hidden
        className="textura-tijolo absolute inset-0 opacity-[0.04]"
      />

      <div className="container-dl relative">
        <Revelar className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Testemunhos</p>
          <h2 className="h-display text-dl-bone mt-4 text-5xl sm:text-6xl">
            Quem treina connosco
          </h2>

          {provaSocial.googleRating ? (
            <a
              href={provaSocial.googleUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="border-dl-coal bg-dl-ink hover:border-dl-red/50 mt-6 inline-flex items-center gap-3 rounded-sm border px-5 py-3 transition-colors"
            >
              <span className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="fill-dl-red text-dl-red h-4 w-4" />
                ))}
              </span>
              <span className="text-dl-bone text-sm font-semibold">
                {provaSocial.googleRating.toFixed(1).replace(".", ",")}
              </span>
              {provaSocial.googleReviewCount && (
                <span className="text-dl-ash text-sm">
                  · {provaSocial.googleReviewCount} avaliações no Google
                </span>
              )}
            </a>
          ) : (
            <p className="border-dl-red/40 bg-dl-red/5 text-dl-ash mx-auto mt-6 max-w-lg border-l-2 py-2 pl-4 text-left text-sm">
              <strong className="text-dl-bone">Falta a avaliação do Google.</strong>{" "}
              Confirmar a nota e o nº de avaliações reais em{" "}
              <code className="text-dl-bone text-xs">content/site.ts</code> (
              <code className="text-xs">provaSocial</code>). É o maior fator de
              SEO local para ginásios.
            </p>
          )}
        </Revelar>

        <ul className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testemunhos.map((testemunho, i) => (
            <Revelar key={testemunho.autor} atraso={i * 0.08} className="h-full">
              <li className="border-dl-coal bg-dl-ink hover:border-dl-red/40 flex h-full flex-col rounded-sm border p-7 transition-colors">
                {/* Estrelas + origem */}
                <div className="flex items-center justify-between">
                  <span className="flex gap-0.5" aria-label={`${testemunho.rating} em 5 estrelas`}>
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={
                          s < testemunho.rating
                            ? "fill-dl-red text-dl-red h-4 w-4"
                            : "text-dl-smoke h-4 w-4"
                        }
                      />
                    ))}
                  </span>
                  <IconeGoogle className="h-4 w-4 opacity-90" />
                </div>

                <blockquote className="text-dl-bone mt-5 flex-1 leading-relaxed">
                  {testemunho.texto}
                </blockquote>

                <figcaption className="border-dl-coal mt-6 flex items-center gap-3 border-t pt-5">
                  <span className="bg-dl-red font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                    {iniciais(testemunho.autor)}
                  </span>
                  <div>
                    <p className="text-dl-bone text-sm font-semibold">
                      {testemunho.autor}
                    </p>
                    <p className="text-dl-steel text-xs">
                      via {testemunho.fonte} · {testemunho.local}
                    </p>
                  </div>
                </figcaption>
              </li>
            </Revelar>
          ))}
        </ul>
      </div>
    </section>
  );
}
