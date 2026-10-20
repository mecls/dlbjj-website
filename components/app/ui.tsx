import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Primitivos partilhados pela área do aluno e pelo painel (design §4):
 * cartões sem sombra, 1px de borda, cantos arredondados, tipografia Inter.
 */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-app-border bg-white", className)}>{children}</div>;
}

export type Variante = "primary" | "default" | "outline" | "ghost" | "danger";

const VARIANTES: Record<Variante, string> = {
  primary: "bg-app-accent text-white hover:bg-dl-red-hover",
  default: "bg-app-accent text-white hover:bg-dl-red-hover",
  outline: "border border-app-border bg-white text-app-text hover:bg-app-soft",
  ghost: "text-app-muted hover:bg-app-soft hover:text-app-text",
  danger: "bg-red-700 text-white hover:bg-red-800",
};

const BASE_BOTAO = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

export function Button({ className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variante }) {
  return <button className={cn(BASE_BOTAO, VARIANTES[variant], className)} {...props} />;
}

export function BotaoLink({ href, variant = "primary", className, children }: { href: string; variant?: Variante; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn(BASE_BOTAO, VARIANTES[variant], className)}>
      {children}
    </Link>
  );
}

const CAMPO = "w-full rounded-lg border border-app-border bg-white px-3 py-2 text-sm text-app-text placeholder:text-app-muted focus:border-app-icon focus:outline-none";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CAMPO, className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(CAMPO, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CAMPO, className)} {...props} />;
}

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("grid gap-1 text-sm", className)} {...props}>
      {children}
    </label>
  );
}

export function Rotulo({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-medium text-app-muted">{children}</span>;
}

export type CorPill = "cinza" | "verde" | "amarelo" | "vermelho" | "azul";

const PILLS: Record<CorPill, string> = {
  cinza: "bg-app-soft text-app-muted",
  verde: "bg-emerald-100 text-emerald-800",
  amarelo: "bg-amber-100 text-amber-800",
  vermelho: "bg-red-100 text-red-800",
  azul: "bg-sky-100 text-sky-800",
};

export function Pill({ cor = "cinza", className, children }: { cor?: CorPill; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", PILLS[cor], className)}>{children}</span>;
}

export function PageHeader({ titulo, children, className }: { titulo: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-4", className)}>
      <h1 className="text-[28px] font-bold tracking-tight text-app-text">{titulo}</h1>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function SectionTitle({ emoji, children, className }: { emoji?: string; children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("flex items-center gap-2 text-[22px] font-bold text-app-text", className)}>
      {emoji ? <span aria-hidden>{emoji}</span> : null}
      {children}
    </h2>
  );
}

export function Tabela({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm", className)}>{children}</table>
    </div>
  );
}

export function Th({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-app-muted", className)} {...props}>
      {children}
    </th>
  );
}

export function Td({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-2 align-middle", className)} {...props}>
      {children}
    </td>
  );
}

export function Tr({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("border-t border-app-border", className)} {...props}>
      {children}
    </tr>
  );
}

/** Aviso de sucesso / erro no topo de uma página (depois de um POST + 303). */
export function Aviso({ tipo = "ok", children }: { tipo?: "ok" | "erro"; children: React.ReactNode }) {
  return (
    <p className={cn("rounded-lg px-3 py-2 text-sm", tipo === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{children}</p>
  );
}
