"use client";

import { useEffect, useState } from "react";

/** Abaixo de `xl` o painel lateral da conversa vira uma folha: botão «Detalhes», painel a deslizar da direita. */
export function DetalhesSheet({ children }: { children: React.ReactNode }) {
  const [aberta, setAberta] = useState(false);

  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberta(false);
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [aberta]);

  return (
    <>
      <button type="button" data-detalhes onClick={() => setAberta(true)} className="rounded-lg border border-app-border px-3 py-1 text-sm hover:bg-app-soft xl:hidden">
        Detalhes
      </button>
      {aberta ? (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button type="button" aria-label="Fechar" onClick={() => setAberta(false)} className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-y-0 right-0 flex w-[440px] max-w-[92vw] flex-col overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-app-border px-5 py-3">
              <span className="text-sm font-semibold">Detalhes</span>
              <button type="button" aria-label="Fechar" onClick={() => setAberta(false)} className="rounded-lg px-2 py-1 text-app-muted hover:bg-app-soft">
                ✕
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
