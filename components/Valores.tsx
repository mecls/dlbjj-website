import { marca } from "@/content/site";

/**
 * Faixa vermelha com os três valores da academia em marquee infinito.
 * Honra · Disciplina · Hierarquia — o coração da identidade DL-BJJ.
 */
export function Valores() {
  /* Duplicado para o marquee poder repetir sem costura visível. */
  const sequencia = [...marca.valores, ...marca.valores, ...marca.valores];
  const linha = [...sequencia, ...sequencia];

  return (
    <section aria-label="Os nossos valores" className="bg-dl-red relative py-5">
      <div className="flex overflow-hidden select-none [mask-image:linear-gradient(90deg,transparent,white_8%,white_92%,transparent)]">
        <div className="animate-marquee flex shrink-0 items-center gap-8">
          {linha.map((valor, i) => (
            <div key={i} className="flex shrink-0 items-center gap-8">
              <span className="h-display text-2xl text-white sm:text-3xl">
                {valor}
              </span>
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rotate-45 bg-white/50"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
