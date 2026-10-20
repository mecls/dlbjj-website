import type { Metadata } from "next";
import { AppShell, type NavItem, type NavSection } from "@/components/app/shell";
import { RealtimeRefresher } from "@/components/painel/realtime-refresher";
import { logoutAction } from "@/app/painel/actions";
import { isAuthed } from "@/lib/auth";
import { isProduction, supabaseConfigured } from "@/lib/config";
import { estadoDaSessao } from "@/lib/painel/sessao-estado";
import { conversasAEspera } from "@/lib/painel/mensagens";
import { serviceClient } from "@/lib/supabase/service";

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

/** O que acende o crachá e o sino: conversas à espera e a sessão do WhatsApp. Sem Supabase (ou com ele em baixo): nada. */
async function sinais(): Promise<{ espera: number; sessaoMal: boolean }> {
  if (!supabaseConfigured()) return { espera: 0, sessaoMal: false };
  try {
    const [espera, { data: sessao }] = await Promise.all([conversasAEspera(), serviceClient().from("dlbjj_sessao").select("estado,visto_em").eq("id", 1).maybeSingle()]);
    return { espera: espera.total, sessaoMal: estadoDaSessao(sessao, new Date(), isProduction()).alerta };
  } catch {
    return { espera: 0, sessaoMal: false };
  }
}

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthed();
  if (!authed) {
    return <div className="min-h-screen bg-app-page text-app-text [color-scheme:light]">{children}</div>;
  }
  const { espera, sessaoMal } = await sinais();
  const nav = NAV.map((s) => ({ ...s, items: s.items.map((i) => (i.href === "/painel/mensagens" && espera > 0 ? { ...i, badge: espera } : i)) }));
  const sino = {
    ativo: espera > 0 || sessaoMal,
    href: espera > 0 ? "/painel/mensagens" : "/painel/agente",
    titulo: espera > 0 ? `${espera} ${espera === 1 ? "conversa à espera" : "conversas à espera"}` : sessaoMal ? "A sessão do WhatsApp precisa de atenção" : "Sem novidades",
  };
  return (
    <>
      <RealtimeRefresher />
      <AppShell
        nav={nav}
        rodape={RODAPE}
        sino={sino}
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
