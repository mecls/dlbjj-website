"use client";

import { motion } from "motion/react";
import { IconeWhatsApp } from "@/components/ui/IconesMarcas";
import { whatsappUrl } from "@/content/site";

/**
 * Botão flutuante de WhatsApp — sempre visível, em todas as secções do site.
 */
export function WhatsAppFlutuante() {
  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.6, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.5 }}
      className="group fixed right-5 bottom-5 z-50 flex h-14 items-center gap-3 rounded-full bg-[#25D366] px-4 text-white shadow-2xl shadow-black/40 transition-colors hover:bg-[#1eb855] sm:right-8 sm:bottom-8"
      aria-label="Marcar aula grátis pelo WhatsApp"
    >
      <IconeWhatsApp className="h-7 w-7 shrink-0" />
      <span className="font-display max-w-0 overflow-hidden text-sm font-bold tracking-[0.1em] whitespace-nowrap uppercase transition-all duration-300 group-hover:max-w-[10rem] group-hover:pr-1">
        Aula grátis
      </span>
    </motion.a>
  );
}
