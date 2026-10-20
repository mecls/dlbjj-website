"use client";

import { useEffect, useRef, useState } from "react";

/** Avatar com as iniciais; ao clicar abre um menu com o nome e o que o servidor lhe passar (irmãos, Sair). */
export function AvatarMenu({ nome, iniciais, children }: { nome: string; iniciais: string; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [aberto]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Menu de ${nome}`}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex size-9 items-center justify-center rounded-full bg-app-soft text-sm font-semibold text-app-text hover:ring-2 hover:ring-app-border"
      >
        {iniciais}
      </button>
      {aberto ? (
        <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-app-border bg-white p-2 shadow-lg">
          <p className="truncate px-2 py-1.5 text-sm font-medium text-app-text">{nome}</p>
          <div className="mt-1 border-t border-app-border pt-1 text-sm">{children}</div>
        </div>
      ) : null}
    </div>
  );
}
