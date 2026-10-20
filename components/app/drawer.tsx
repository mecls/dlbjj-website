"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Icone } from "./icones";
import { SidebarNav, type NavItem, type NavSection } from "./sidebar-nav";

/**
 * No telemóvel a barra lateral vira uma gaveta: botão no topo, painel a
 * deslizar. Guarda-se o caminho em que foi aberta; ao navegar, o caminho muda
 * e a gaveta fecha sozinha — sem efeito nem setState em efeito.
 */
export function Drawer({ nav, rodape, logo }: { nav: NavSection[]; rodape: NavItem[]; logo: React.ReactNode }) {
  const pathname = usePathname();
  const [abertaEm, setAbertaEm] = useState<string | null>(null);
  const aberta = abertaEm === pathname;
  const setAberta = (v: boolean) => setAbertaEm(v ? pathname : null);

  return (
    <>
      <button
        type="button"
        data-drawer
        aria-label="Menu"
        aria-expanded={aberta}
        onClick={() => setAberta(true)}
        className="flex size-10 items-center justify-center rounded-lg text-app-icon hover:bg-app-soft lg:hidden"
      >
        <Icone nome="menu" className="size-6" />
      </button>
      {aberta ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Fechar menu" onClick={() => setAberta(false)} className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-y-0 left-0 flex w-[300px] max-w-[85vw] flex-col border-r border-app-border bg-white px-4 py-6">
            <div className="mb-6 flex justify-center">{logo}</div>
            <SidebarNav nav={nav} rodape={rodape} />
          </div>
        </div>
      ) : null}
    </>
  );
}
