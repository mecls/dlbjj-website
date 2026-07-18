import { ArrowRight, Check } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Revelar } from "@/components/ui/Revelar";
import { precos, whatsappUrl } from "@/content/site";
import { cn } from "@/lib/utils";

export function Precos() {
  /* Secção inteira desliga-se a partir de content/site.ts */
  if (!precos.mostrarPrecos) return null;

  return (
    <section id="precos" className="bg-dl-ink relative py-24 sm:py-32">
      <div className="container-dl">
        <Revelar className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{precos.etiqueta}</p>
          <h2 className="h-display text-dl-bone mt-4 text-5xl sm:text-6xl">
            {precos.titulo}
          </h2>
          <p className="text-dl-ash mt-5 text-base leading-relaxed sm:text-lg">
            {precos.subtitulo}
          </p>
        </Revelar>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {precos.planos.map((plano, i) => (
            <Revelar key={plano.nome} atraso={i * 0.1} className="h-full">
              <article
                className={cn(
                  "relative flex h-full flex-col rounded-sm border p-8 transition-all duration-300",
                  plano.destaque
                    ? "border-dl-red bg-dl-black shadow-dl-red/10 shadow-2xl lg:-translate-y-3"
                    : "border-dl-coal bg-dl-black/60 hover:border-dl-smoke",
                )}
              >
                {plano.destaque && (
                  <span className="bg-dl-red font-display absolute -top-3 left-1/2 -translate-x-1/2 rounded-sm px-4 py-1 text-xs font-bold tracking-[0.15em] whitespace-nowrap text-white uppercase">
                    Mais popular
                  </span>
                )}

                <h3 className="h-display text-dl-bone text-2xl">{plano.nome}</h3>
                <p className="text-dl-ash mt-1.5 text-sm">{plano.descricao}</p>

                {/* Preço */}
                <div className="border-dl-coal mt-6 border-t pt-6">
                  {plano.preco ? (
                    <p className="flex items-baseline gap-1">
                      <span className="h-display text-dl-bone text-5xl">
                        {plano.preco}€
                      </span>
                      <span className="text-dl-steel text-sm">{plano.periodo}</span>
                    </p>
                  ) : (
                    <p className="border-dl-red/40 bg-dl-red/5 text-dl-ash border-l-2 py-2 pl-3 text-xs">
                      <strong className="text-dl-bone">Falta o preço.</strong>{" "}
                      Preencher em{" "}
                      <code className="text-dl-bone">content/site.ts</code>
                    </p>
                  )}
                </div>

                {/* Inclui */}
                <ul className="mt-6 flex-1 space-y-3">
                  {plano.inclui.map((item) => (
                    <li
                      key={item}
                      className="text-dl-ash flex items-start gap-2.5 text-sm"
                    >
                      <Check className="text-dl-red mt-0.5 h-4 w-4 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Botao
                  href={whatsappUrl}
                  externo
                  variante={plano.destaque ? "vermelho" : "contorno"}
                  className="mt-8 w-full"
                >
                  Começar
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Botao>
              </article>
            </Revelar>
          ))}
        </div>

        {precos.nota && (
          <p className="text-dl-steel mx-auto mt-8 max-w-2xl text-center text-xs">
            {precos.nota}
          </p>
        )}
      </div>
    </section>
  );
}
