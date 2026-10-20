import Link from "next/link";
import { AvatarMenu } from "./avatar-menu";
import { Drawer } from "./drawer";
import { Icone } from "./icones";
import { Logotipo } from "./logotipo";
import { SidebarNav, type NavItem, type NavSection } from "./sidebar-nav";

export type { NavItem, NavSection };

/**
 * A moldura partilhada (design §4): barra lateral de 300px em ecrãs grandes
 * (gaveta no telemóvel), barra de topo de 72px com sino e avatar, conteúdo
 * até 1360px. Server component: só passa dados serializáveis aos clientes.
 */
export function AppShell({
  nav,
  rodape,
  utilizador,
  sino,
  children,
}: {
  nav: NavSection[];
  rodape: NavItem[];
  utilizador: { nome: string; iniciais: string; menu: React.ReactNode };
  sino?: { href: string; ativo: boolean; titulo: string };
  children: React.ReactNode;
}) {
  const inicio = nav[0]?.items[0]?.href ?? "/";
  return (
    <div id="shell" className="min-h-screen bg-app-bg text-app-text [color-scheme:light] lg:grid lg:grid-cols-[300px_1fr]">
      <aside id="sidebar" className="hidden border-r border-app-border px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Link href={inicio} className="mb-8 flex justify-center">
          <Logotipo />
        </Link>
        <SidebarNav nav={nav} rodape={rodape} />
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-app-border px-4 lg:justify-end lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <Drawer nav={nav} rodape={rodape} logo={<Logotipo />} />
            <Link href={inicio}>
              <Logotipo className="h-9" />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {sino ? (
              <Link href={sino.href} title={sino.titulo} data-sino={sino.ativo ? "ativo" : "inativo"} className="relative flex size-9 items-center justify-center rounded-lg text-app-icon hover:bg-app-soft">
                <Icone nome="sino" className="size-5" />
                {sino.ativo ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-app-accent" /> : null}
              </Link>
            ) : null}
            <AvatarMenu nome={utilizador.nome} iniciais={utilizador.iniciais}>
              {utilizador.menu}
            </AvatarMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 lg:px-12 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
