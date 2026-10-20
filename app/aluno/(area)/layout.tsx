import type { Metadata } from "next";
import { AppShell, type NavItem, type NavSection } from "@/components/app/shell";
import { iniciaisDe } from "@/lib/aluno/nomes";
import { requireAluno } from "@/lib/aluno/sessao";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Área de aluno — DL-BJJ",
  robots: { index: false, follow: false },
};

const NAV: NavSection[] = [
  { items: [{ href: "/aluno", label: "Início", icone: "inicio", exact: true }] },
  {
    caption: "Treino",
    items: [
      { href: "/aluno/historico", label: "Histórico", icone: "historico" },
      { href: "/aluno/ranking", label: "Ranking", icone: "ranking" },
      { href: "/aluno/calendario", label: "Calendário", icone: "calendario" },
    ],
  },
];

const RODAPE: NavItem[] = [{ href: "https://wa.me/351925797266", label: "WhatsApp da academia", icone: "whatsapp" }];

/** A moldura da área do aluno. Cada página volta a chamar requireAluno(): um layout não protege rotas aninhadas. */
export default async function AreaAlunoLayout({ children }: { children: React.ReactNode }) {
  const { aluno, irmaos } = await requireAluno();
  return (
    <AppShell
      nav={NAV}
      rodape={RODAPE}
      utilizador={{
        nome: aluno.nome,
        iniciais: iniciaisDe(aluno.nome),
        menu: (
          <>
            {irmaos.map((i) => (
              <form key={i.id} method="post" action="/api/aluno/escolher">
                <input type="hidden" name="aluno_id" value={i.id} />
                <button className="w-full rounded-lg px-2 py-1.5 text-left text-app-text hover:bg-app-soft">Ver {i.nome}</button>
              </form>
            ))}
            <form method="post" action="/api/aluno/sair">
              <button className="w-full rounded-lg px-2 py-1.5 text-left text-app-text hover:bg-app-soft">Sair</button>
            </form>
          </>
        ),
      }}
    >
      {children}
    </AppShell>
  );
}
