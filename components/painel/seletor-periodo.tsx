import Link from "next/link";
import { PRESETS, type Periodo } from "@/lib/aulas/periodo";
import { cn } from "@/lib/utils";

/** Hoje · 7 · 30 · 90 dias, e um intervalo à escolha. `base` é a página que o recebe. */
export function SeletorPeriodo({ base, periodo }: { base: string; periodo: Periodo }) {
  const personalizado = periodo.chave === "personalizado";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 rounded-lg border border-app-border p-1 text-sm">
        {PRESETS.map((p) => (
          <Link key={p.chave} href={`${base}?dias=${p.chave}`} className={cn("rounded-md px-3 py-1.5", periodo.chave === p.chave ? "bg-app-soft font-medium" : "text-app-muted hover:text-app-text")}>
            {p.label}
          </Link>
        ))}
      </div>
      <form method="get" action={base} className={cn("flex items-center gap-1 rounded-lg border border-app-border p-1 text-sm", personalizado && "bg-app-soft")}>
        <span className={cn("px-2", personalizado ? "font-medium" : "text-app-muted")}>Personalizado</span>
        <input type="date" name="desde" defaultValue={personalizado ? periodo.desde : ""} required className="rounded-md border border-app-border bg-white px-2 py-1 text-sm" />
        <span className="text-app-muted">–</span>
        <input type="date" name="ate" defaultValue={personalizado ? periodo.ate : ""} required className="rounded-md border border-app-border bg-white px-2 py-1 text-sm" />
        <button className="rounded-md px-3 py-1 font-medium hover:bg-white">Ver</button>
      </form>
    </div>
  );
}
