"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * A janela modal dos eventos (ajustes §2.5): o conteúdo vem do servidor (o
 * formulário); fechar (✕, fundo, Esc) é navegar para `fechar` (o mês em que
 * se estava), por isso o estado vive no endereço e um reload reabre-a.
 */
export function EventoModal({ titulo, fechar, children }: { titulo: string; fechar: string; children: React.ReactNode }) {
  const router = useRouter();
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    caixa.current?.querySelector<HTMLInputElement>("input:not([type=hidden])")?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(fechar);
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [router, fechar]);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <button type="button" aria-label="Fechar" onClick={() => router.push(fechar)} className="absolute inset-0 bg-black/30" />
      <div ref={caixa} role="dialog" aria-modal="true" aria-label={titulo} className="relative w-full max-w-2xl rounded-xl border border-app-border bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button type="button" aria-label="Fechar" onClick={() => router.push(fechar)} className="rounded-lg px-2 py-1 text-app-muted hover:bg-app-soft">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
