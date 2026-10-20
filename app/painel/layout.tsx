import type { Metadata } from "next";
import { AppShell, type NavItem, type NavSection } from "@/components/app/shell";
import { RealtimeRefresher } from "@/components/painel/realtime-refresher";
import { logoutAction } from "@/app/painel/actions";
import { isAuthed } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Painel — DL-BJJ",
  robots: { index: false, follow: false },
};

const NAV: NavSection[] = [
  { items: [{ href: "/painel", label: "Início", icone: "inicio", exact: true }] },
  {
    caption: "Academia",
    items: [
      { href: "/painel/mensagens", label: "Mensagens", icone: "mensagens" },
      { href: "/painel/alunos", label: "Alunos", icone: "alunos" },
      { href: "/painel/aulas", label: "Aulas", icone: "aulas" },
      { href: "/painel/eventos", label: "Eventos", icone: "eventos" },
      { href: "/painel/reativacao", label: "Reativação", icone: "reativacao" },
    ],
  },
  {
    caption: "Ferramentas",
    items: [
      { href: "/painel/perguntar", label: "Perguntar", icone: "perguntar" },
      { href: "/painel/agente", label: "Agente", icone: "agente" },
    ],
  },
];

const RODAPE: NavItem[] = [{ href: "/", label: "Site", icone: "site" }];

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthed();
  if (!authed) {
    return <div className="min-h-screen bg-app-page text-app-text [color-scheme:light]">{children}</div>;
  }
  return (
    <>
      <RealtimeRefresher />
      <AppShell
        nav={NAV}
        rodape={RODAPE}
        utilizador={{
          nome: "Daniel",
          iniciais: "DL",
          menu: (
            <form action={logoutAction}>
              <button className="w-full rounded-lg px-2 py-1.5 text-left text-app-text hover:bg-app-soft">Sair</button>
            </form>
          ),
        }}
      >
        {children}
      </AppShell>
    </>
  );
}
