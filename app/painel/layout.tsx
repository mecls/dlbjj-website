import type { Metadata } from "next";
import Link from "next/link";
import { RealtimeRefresher } from "@/components/painel/realtime-refresher";
import { logoutAction } from "@/app/painel/actions";

export const metadata: Metadata = {
  title: "Painel — Onboarding DL-BJJ",
  robots: { index: false, follow: false },
};

export default function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <RealtimeRefresher />
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/painel" className="flex items-center gap-2">
            <span className="bg-dl-red rounded-md px-2 py-1 text-sm font-bold text-white">
              DL-BJJ
            </span>
            <span className="text-sm font-semibold text-neutral-700">
              Inscrições
            </span>
          </Link>
          <form action={logoutAction} className="ml-auto">
            <button className="text-xs text-neutral-500 hover:text-neutral-800">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
