import { cn } from "@/lib/utils";
import { STATUS_LABEL, type LeadStatus } from "@/lib/bot/types";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

const STATUS_STYLE: Record<LeadStatus, string> = {
  novo: "bg-sky-100 text-sky-800",
  em_progresso: "bg-amber-100 text-amber-800",
  concluido: "bg-emerald-100 text-emerald-800",
  inscrito: "bg-emerald-200 text-emerald-900",
  humano: "bg-red-100 text-red-800",
  perdido: "bg-neutral-200 text-neutral-600",
  descartado: "bg-neutral-100 text-neutral-500",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_STYLE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Button({
  className,
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "danger" | "ghost";
}) {
  const variants = {
    default: "bg-dl-red text-white hover:bg-dl-red-hover",
    outline:
      "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
    danger: "bg-red-700 text-white hover:bg-red-800",
    ghost: "text-neutral-600 hover:bg-neutral-100",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
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
