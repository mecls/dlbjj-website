import { cn } from "@/lib/utils";
import { hojeLisboa } from "@/lib/tempo";

export const ESTADO_ALUNO_LABEL: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  ex_aluno: "Ex-aluno",
  anonimizado: "Anonimizado",
};

const ESTILO: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-800",
  inativo: "bg-amber-100 text-amber-800",
  ex_aluno: "bg-neutral-200 text-neutral-600",
  anonimizado: "bg-neutral-100 text-neutral-400",
};

export function EstadoAlunoBadge({ estado }: { estado: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", ESTILO[estado] ?? "bg-neutral-100")}>
      {ESTADO_ALUNO_LABEL[estado] ?? estado}
    </span>
  );
}

/** "há 3 dias" a partir de um YYYY-MM-DD. */
export function diasDesde(dia: string): string {
  const [y, m, d] = dia.split("-").map(Number);
  const [hy, hm, hd] = hojeLisboa().split("-").map(Number);
  const n = Math.round((Date.UTC(hy, hm - 1, hd) - Date.UTC(y, m - 1, d)) / 86_400_000);
  if (n <= 0) return "hoje";
  if (n === 1) return "ontem";
  return `há ${n} dias`;
}

export function dataPt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
