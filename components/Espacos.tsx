"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Expand, MoveHorizontal, X } from "lucide-react";
import { Revelar } from "@/components/ui/Revelar";
import { espacos } from "@/content/site";

export function Espacos() {
  const filmstripRef = useRef<HTMLUListElement>(null);
  /** Índice aberto no modo "passeio" (lightbox). null = fechado. */
  const [aberto, setAberto] = useState<number | null>(null);

  const total = espacos.length;
  const abrir = useCallback((i: number) => setAberto(i), []);
  const fechar = useCallback(() => setAberto(null), []);
  const seguinte = useCallback(
    () => setAberto((i) => (i === null ? i : (i + 1) % total)),
    [total],
  );
  const anterior = useCallback(
    () => setAberto((i) => (i === null ? i : (i - 1 + total) % total)),
    [total],
  );

  /* Deslizar a filmstrip com as setas. */
  const deslizar = (dir: 1 | -1) => {
    const el = filmstripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  /* Teclado no modo passeio: Esc fecha, setas navegam. Bloqueia scroll. */
  useEffect(() => {
    if (aberto === null) return;
    document.body.style.overflow = "hidden";
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      else if (e.key === "ArrowRight") seguinte();
      else if (e.key === "ArrowLeft") anterior();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto, fechar, seguinte, anterior]);

  return (
    <section id="espacos" className="bg-dl-ink relative overflow-hidden py-24 sm:py-32">
      <div className="container-dl">
        <Revelar className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow">Espaços</p>
            <h2 className="h-display text-dl-bone mt-4 text-5xl sm:text-6xl">
              Dê uma volta pelo espaço
            </h2>
            <p className="text-dl-ash mt-5 text-base leading-relaxed sm:text-lg">
              Da receção ao tatame, veja onde vai treinar. Toque numa foto para
              a ver em grande e percorrer o espaço.
            </p>
          </div>

          {/* Setas da filmstrip (desktop) */}
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => deslizar(-1)}
              aria-label="Fotos anteriores"
              className="border-dl-coal text-dl-bone hover:border-dl-red hover:bg-dl-red inline-flex h-12 w-12 items-center justify-center rounded-sm border transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => deslizar(1)}
              aria-label="Fotos seguintes"
              className="border-dl-coal text-dl-bone hover:border-dl-red hover:bg-dl-red inline-flex h-12 w-12 items-center justify-center rounded-sm border transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </Revelar>
      </div>

      {/* Filmstrip — passeio horizontal */}
      <Revelar atraso={0.1}>
        <ul
          ref={filmstripRef}
          className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 md:px-8"
        >
          {espacos.map((espaco, i) => (
            <li key={espaco.src} className="snap-start shrink-0">
              <button
                type="button"
                onClick={() => abrir(i)}
                className="group border-dl-coal bg-dl-black hover:border-dl-red/60 relative block aspect-3/4 w-[72vw] overflow-hidden rounded-sm border transition-colors sm:w-[300px] lg:w-[340px]"
                aria-label={`Ver ${espaco.legenda} em grande`}
              >
                <Image
                  src={espaco.src}
                  alt={espaco.legenda}
                  fill
                  sizes="(max-width: 640px) 72vw, 340px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="from-dl-void/90 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />

                {/* Ícone de expandir */}
                <span className="bg-dl-ink/70 text-dl-bone absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-sm opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <Expand className="h-4 w-4" />
                </span>

                {/* Legenda */}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-4">
                  <span className="bg-dl-red h-4 w-1 shrink-0" />
                  <span className="font-display text-dl-bone text-lg tracking-wide uppercase">
                    {espaco.legenda}
                  </span>
                </div>
              </button>
            </li>
          ))}

          {/* Espaço final para o snap respirar */}
          <li aria-hidden className="shrink-0 pr-1" />
        </ul>
      </Revelar>

      {/* Dica de interação */}
      <div className="container-dl">
        <p className="text-dl-steel mt-6 flex items-center gap-2 text-sm">
          <MoveHorizontal className="text-dl-red h-4 w-4" />
          Arraste para explorar
        </p>
      </div>

      {/* Modo passeio (lightbox) */}
      <AnimatePresence>
        {aberto !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-70 flex flex-col bg-black/92 backdrop-blur-sm"
            onClick={fechar}
            role="dialog"
            aria-modal="true"
            aria-label="Galeria de espaços"
          >
            {/* Barra superior */}
            <div className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-8">
              <span className="font-display text-dl-bone text-sm tracking-[0.15em] uppercase">
                {espacos[aberto].legenda}
                <span className="text-dl-steel ml-3 tabular-nums">
                  {aberto + 1} / {total}
                </span>
              </span>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar"
                className="text-dl-bone hover:bg-white/10 inline-flex h-11 w-11 items-center justify-center rounded-sm transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Imagem + setas */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-6">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  anterior();
                }}
                aria-label="Anterior"
                className="text-dl-bone absolute left-2 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/15 sm:left-6"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>

              <AnimatePresence mode="wait">
                <motion.div
                  key={aberto}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="relative h-full w-full max-w-5xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Image
                    src={espacos[aberto].src}
                    alt={espacos[aberto].legenda}
                    fill
                    sizes="100vw"
                    className="object-contain"
                    loading="eager"
                  />
                </motion.div>
              </AnimatePresence>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  seguinte();
                }}
                aria-label="Seguinte"
                className="text-dl-bone absolute right-2 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/15 sm:right-6"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
