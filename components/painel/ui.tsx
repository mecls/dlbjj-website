import { cn } from "@/lib/utils";
import { STATUS_LABEL, type LeadStatus } from "@/lib/bot/types";

/** Os primitivos vivem em components/app/ui (partilhados com a área do aluno); aqui ficam os do painel. */
export * from "@/components/app/ui";

const STATUS_STYLE: Record<LeadStatus, string> = {
  novo: "bg-sky-100 text-sky-800",
  em_progresso: "bg-amber-100 text-amber-800",
  concluido: "bg-emerald-100 text-emerald-800",
  inscrito: "bg-emerald-200 text-emerald-900",
  humano: "bg-red-100 text-red-800",
  perdido: "bg-app-soft text-app-muted",
  descartado: "bg-app-soft text-app-muted",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}
