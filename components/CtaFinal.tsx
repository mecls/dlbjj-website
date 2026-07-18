import { ArrowRight, Phone } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Revelar } from "@/components/ui/Revelar";
import { contactos, ctaFinal, whatsappUrl } from "@/content/site";

export function CtaFinal() {
  return (
    <section className="bg-dl-red relative overflow-hidden py-24 sm:py-28">
      {/* Textura + faixa diagonal para dar profundidade ao vermelho */}
      <div
        aria-hidden
        className="textura-tijolo absolute inset-0 opacity-[0.07] mix-blend-multiply"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/25"
      />

      <div className="container-dl relative">
        <Revelar className="mx-auto max-w-3xl text-center">
          <p className="font-display flex items-center justify-center gap-2.5 text-sm font-bold tracking-[0.2em] text-white/70 uppercase">
            <span className="h-px w-8 bg-white/50" />
            {ctaFinal.sobretitulo}
            <span className="h-px w-8 bg-white/50" />
          </p>

          <h2 className="h-display mt-6 text-5xl text-white sm:text-6xl lg:text-7xl">
            {ctaFinal.titulo}
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
            {ctaFinal.subtitulo}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Botao href={whatsappUrl} externo variante="claro" tamanho="lg">
              {ctaFinal.cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Botao>

            <a
              href={`tel:${contactos.telefoneDigitos}`}
              className="font-display inline-flex h-14 items-center justify-center gap-2.5 rounded-sm border-2 border-white/40 px-8 text-base font-bold tracking-[0.1em] text-white uppercase transition-colors hover:border-white hover:bg-white/10"
            >
              <Phone className="h-4 w-4" />
              {contactos.telefone}
            </a>
          </div>
        </Revelar>
      </div>
    </section>
  );
}
