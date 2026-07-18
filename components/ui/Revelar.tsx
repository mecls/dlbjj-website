"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Atraso em segundos — útil para escalonar itens de uma grelha. */
  atraso?: number;
};

/**
 * Revela o conteúdo suavemente quando entra no ecrã.
 * O `motion` respeita automaticamente `prefers-reduced-motion`.
 */
export function Revelar({ children, className, atraso = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay: atraso, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
