import type { CelulaCalor } from "@/lib/aluno/estatisticas";
import { cn } from "@/lib/utils";

/**
 * O "mapa de calor" dos cartões (design §4): 7 linhas (seg→dom) × N semanas,
 * quadrados de 12px com 3px de intervalo. Dados reais, não decoração.
 */
function cor(c: CelulaCalor): string {
  if (c.futuro) return "bg-transparent";
  if (c.n === 0) return "bg-app-soft";
  if (c.n === 1) return "bg-[#d9dce3]";
  return "bg-[#b8bdc9]";
}

export function MapaDeCalor({ celulas, className }: { celulas: CelulaCalor[]; className?: string }) {
  return (
    <div className={cn("grid grid-flow-col grid-rows-7 gap-[3px]", className)} aria-hidden>
      {celulas.map((c) => (
        <span key={c.dia} title={`${c.dia}: ${c.n}`} className={cn("size-3 rounded-[2px]", cor(c))} />
      ))}
    </div>
  );
}
