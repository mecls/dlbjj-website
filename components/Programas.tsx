import Image from "next/image";
import { ArrowRight, UserRound } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Revelar } from "@/components/ui/Revelar";
import { aulasPrivadas, programas, whatsappUrl } from "@/content/site";
import { cn } from "@/lib/utils";

export function Programas() {
  return (
    <section
      id="programas"
      className="bg-dl-black relative py-24 sm:py-32"
    >
      <div className="container-dl">
        {/* Cabeçalho */}
        <Revelar className="max-w-2xl">
          <p className="eyebrow">Programas</p>
          <h2 className="h-display text-dl-bone mt-4 text-5xl sm:text-6xl">
            Escolha o seu caminho no tatame
          </h2>
          <p className="text-dl-ash mt-5 text-base leading-relaxed sm:text-lg">
            Vários caminhos, o mesmo propósito: evoluir o corpo, a mente e o
            caráter. Não precisa de experiência — só de aparecer.
          </p>
        </Revelar>

        {/* Cartões */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {programas.map((programa, i) => {
            const modoFoto = programa.imagemModo === "cover";
            return (
            <Revelar key={programa.id} atraso={i * 0.08}>
              <article className="group border-dl-coal bg-dl-ink hover:border-dl-red/60 relative flex h-full flex-col overflow-hidden rounded-sm border transition-all duration-300 hover:-translate-y-1">
                {/* Imagem */}
                <div className="bg-dl-void relative aspect-4/3 overflow-hidden">
                  {!modoFoto && (
                    <div className="textura-tijolo absolute inset-0 opacity-40" />
                  )}
                  <div className="from-dl-ink absolute inset-0 z-10 bg-gradient-to-t via-transparent to-transparent" />
                  <Image
                    src={programa.imagem}
                    alt={programa.nome}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className={cn(
                      "transition-transform duration-500",
                      modoFoto
                        ? cn(
                            "object-cover group-hover:scale-105",
                            programa.imagemPos ?? "object-center",
                          )
                        : "scale-95 object-contain object-bottom group-hover:scale-100",
                    )}
                  />
                  {programa.destaque && (
                    <span className="bg-dl-red font-display absolute top-4 left-4 z-20 rounded-sm px-3 py-1 text-xs font-bold tracking-[0.15em] text-white uppercase">
                      Mais procurado
                    </span>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="relative flex flex-1 flex-col p-7">
                  <div className="bg-dl-red absolute top-0 left-7 h-1 w-12 -translate-y-1/2 transition-all duration-300 group-hover:w-20" />
                  <h3 className="h-display text-dl-bone text-2xl">
                    {programa.nome}
                  </h3>
                  <p className="text-dl-steel mt-1.5 text-xs font-medium tracking-[0.1em] uppercase">
                    {programa.publico}
                  </p>
                  <p className="text-dl-ash mt-4 flex-1 text-sm leading-relaxed">
                    {programa.descricao}
                  </p>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dl-red font-display mt-6 inline-flex items-center gap-2 text-sm font-bold tracking-[0.1em] uppercase transition-colors hover:text-white"
                  >
                    Marcar aula grátis
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </a>
                </div>
              </article>
            </Revelar>
            );
          })}
        </div>

        {/* Aulas privadas — faixa destacada */}
        <Revelar atraso={0.15}>
          <div className="border-dl-coal bg-dl-ink relative mt-5 flex flex-col items-start gap-6 overflow-hidden rounded-sm border p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div
              aria-hidden
              className="faixa-diagonal absolute inset-y-0 right-0 w-1/3 opacity-[0.05]"
            />
            <div className="relative flex items-start gap-5">
              <span className="bg-dl-red/10 text-dl-red hidden h-14 w-14 shrink-0 items-center justify-center rounded-sm sm:flex">
                <UserRound className="h-7 w-7" />
              </span>
              <div>
                <h3 className="h-display text-dl-bone text-2xl">
                  {aulasPrivadas.nome}
                </h3>
                <p className="text-dl-ash mt-2 max-w-xl text-sm leading-relaxed">
                  {aulasPrivadas.descricao}
                </p>
              </div>
            </div>
            <Botao href={whatsappUrl} externo className="relative shrink-0">
              {aulasPrivadas.cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Botao>
          </div>
        </Revelar>
      </div>
    </section>
  );
}
