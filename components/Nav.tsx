"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { marca, navegacao, whatsappUrl } from "@/content/site";
import { cn } from "@/lib/utils";

export function Nav() {
  const [comScroll, setComScroll] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  /* A navbar ganha fundo sólido assim que se sai do topo. */
  useEffect(() => {
    const aoScroll = () => setComScroll(window.scrollY > 24);
    aoScroll();
    window.addEventListener("scroll", aoScroll, { passive: true });
    return () => window.removeEventListener("scroll", aoScroll);
  }, []);

  /* Bloqueia o scroll do body enquanto o menu mobile está aberto. */
  useEffect(() => {
    document.body.style.overflow = menuAberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuAberto]);

  /* Fecha o menu com a tecla Escape. */
  useEffect(() => {
    if (!menuAberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [menuAberto]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          comScroll
            ? "bg-dl-ink/90 border-b border-white/10 backdrop-blur-lg"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <nav
          aria-label="Navegação principal"
          className="container-dl flex h-20 items-center justify-between gap-6"
        >
          {/* Logótipo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3"
            aria-label={`${marca.nome} — início`}
          >
            <Image
              src="/brand/logo.png"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 object-contain"
              loading="eager"
              fetchPriority="high"
            />
            <span className="hidden sm:block">
              <span className="h-display text-dl-bone block text-lg leading-none">
                Academia <span className="text-dl-red">DL</span>-BJJ
              </span>
              <span className="text-dl-ash mt-0.5 block text-[0.6875rem] font-medium tracking-[0.18em] uppercase">
                Brazilian Jiu-Jitsu
              </span>
            </span>
          </Link>

          {/* Links — desktop */}
          <ul className="hidden items-center gap-1 lg:flex">
            {navegacao.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-dl-ash hover:text-dl-bone font-display relative rounded-sm px-4 py-2 text-sm font-semibold tracking-[0.1em] uppercase transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          {/* CTA + botão de menu */}
          <div className="flex items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-dl-red hover:bg-dl-red-hover font-display shadow-dl-red/25 hidden h-11 items-center rounded-sm px-6 text-sm font-bold tracking-[0.1em] text-white uppercase shadow-lg transition-colors sm:inline-flex"
            >
              Aula grátis
            </a>

            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              className="text-dl-bone hover:bg-white/10 inline-flex h-11 w-11 items-center justify-center rounded-sm transition-colors lg:hidden"
              aria-label="Abrir menu"
              aria-expanded={menuAberto}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </nav>
      </header>

      {/* Menu mobile em ecrã inteiro */}
      <AnimatePresence>
        {menuAberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-dl-ink fixed inset-0 z-60 lg:hidden"
          >
            <div className="textura-tijolo absolute inset-0 opacity-15" />
            <div className="relative flex h-full flex-col">
              <div className="container-dl flex h-20 shrink-0 items-center justify-between">
                <Image
                  src="/brand/logo.png"
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 object-contain"
                />
                <button
                  type="button"
                  onClick={() => setMenuAberto(false)}
                  className="text-dl-bone hover:bg-white/10 inline-flex h-11 w-11 items-center justify-center rounded-sm transition-colors"
                  aria-label="Fechar menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <nav
                aria-label="Navegação mobile"
                className="container-dl flex flex-1 flex-col justify-center gap-1 pb-20"
              >
                {navegacao.map((item, i) => (
                  <motion.a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuAberto(false)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.05 }}
                    className="h-display text-dl-bone hover:text-dl-red border-b border-white/10 py-5 text-4xl transition-colors"
                  >
                    {item.label}
                  </motion.a>
                ))}

                <motion.a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-dl-red hover:bg-dl-red-hover font-display mt-8 inline-flex h-14 items-center justify-center rounded-sm text-base font-bold tracking-[0.1em] text-white uppercase transition-colors"
                >
                  Marcar aula grátis
                </motion.a>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
