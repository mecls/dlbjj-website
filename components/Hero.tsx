import Image from "next/image";
import { ArrowRight, CalendarDays, MapPin, Star } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { hero, marca, provaSocial, whatsappUrl } from "@/content/site";

/** Divide o título para destacar uma expressão a vermelho. */
function TituloDestacado({ texto, destaque }: { texto: string; destaque: string }) {
  const i = texto.indexOf(destaque);
  if (i === -1) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <span className="text-dl-red">{destaque}</span>
      {texto.slice(i + destaque.length)}
    </>
  );
}

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden pt-20">
      {/* Fundo: foto real quando existir, textura de tijolo enquanto não houver */}
      <div className="absolute inset-0 -z-20">
        {hero.imagem ? (
          <Image
            src={hero.imagem}
            alt={hero.imagemAlt}
            fill
            sizes="100vw"
            className="object-cover"
            loading="eager"
            fetchPriority="high"
            quality={75}
          />
        ) : (
          <div className="textura-tijolo bg-dl-void h-full w-full" />
        )}
      </div>

      {/* Véus de escurecimento: mais leves, para deixar ver a foto, mantendo o
          texto legível à esquerda e a base para a barra de confiança */}
      <div className="from-dl-ink/95 via-dl-ink/55 to-dl-ink/5 absolute inset-0 -z-10 bg-gradient-to-r" />
      <div className="from-dl-ink/85 absolute inset-0 -z-10 bg-gradient-to-t via-transparent to-transparent" />

      {/* Faixa vermelha diagonal, ecoando a faixa do logótipo */}
      <div
        aria-hidden
        className="faixa-diagonal absolute top-0 right-0 -z-10 hidden h-full w-[38%] opacity-[0.06] lg:block"
        style={{ clipPath: "polygon(38% 0, 100% 0, 100% 100%, 0 100%)" }}
      />

      <div className="container-dl relative py-20">
        <div className="max-w-3xl [text-shadow:0_2px_24px_rgba(13,11,12,0.7)]">
          {/* Sobretítulo */}
          <p className="text-dl-red font-display mb-6 flex items-center gap-2.5 text-sm font-bold tracking-[0.2em] uppercase">
            <span className="bg-dl-red h-px w-8" />
            {hero.sobretitulo}
          </p>

          {/* Título */}
          <h1 className="h-display text-dl-bone text-[3.25rem] leading-[0.9] sm:text-7xl lg:text-8xl">
            <TituloDestacado texto={hero.titulo} destaque={hero.destaque} />
          </h1>

          {/* Lema */}
          <p className="border-dl-red text-dl-bone/90 mt-8 max-w-xl border-l-2 pl-5 text-lg font-medium italic">
            &ldquo;{marca.lema}&rdquo;
          </p>

          {/* Subtítulo */}
          <p className="text-dl-ash mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
            {hero.subtitulo}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Botao href={whatsappUrl} externo tamanho="lg">
              {hero.ctaPrimario}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Botao>
            <Botao href="#programas" variante="contorno" tamanho="lg">
              {hero.ctaSecundario}
            </Botao>
          </div>

          {/* Barra de confiança */}
          <ul className="text-dl-ash mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
            {provaSocial.googleRating && (
              <li className="flex items-center gap-2">
                <Star className="fill-dl-red text-dl-red h-4 w-4" />
                <span>
                  <strong className="text-dl-bone font-semibold">
                    {provaSocial.googleRating.toFixed(1).replace(".", ",")}
                  </strong>
                  {provaSocial.googleReviewCount
                    ? ` · ${provaSocial.googleReviewCount} avaliações`
                    : ""}
                </span>
              </li>
            )}
            <li className="flex items-center gap-2">
              <CalendarDays className="text-dl-red h-4 w-4" />
              <span>
                Desde{" "}
                <strong className="text-dl-bone font-semibold">
                  {marca.fundadaEm}
                </strong>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="text-dl-red h-4 w-4" />
              <span>
                <strong className="text-dl-bone font-semibold">Queluz</strong> e{" "}
                <strong className="text-dl-bone font-semibold">São Brás</strong>
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Lembrete discreto — desaparece sozinho assim que hero.imagem existir */}
      {!hero.imagem && (
        <p className="border-dl-red/40 bg-dl-ink/85 text-dl-ash absolute right-5 bottom-5 hidden max-w-xs rounded-sm border-l-2 px-4 py-2.5 text-xs backdrop-blur-sm lg:block">
          <strong className="text-dl-bone">Falta a foto principal.</strong> Foto
          larga de um treino em ação → <code>public/fotos/hero.jpg</code>, depois{" "}
          <code>hero.imagem</code> em <code>content/site.ts</code>.
        </p>
      )}
    </section>
  );
}
