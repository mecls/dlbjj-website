import Link from "next/link";
import { cn } from "@/lib/utils";

type Variante = "vermelho" | "contorno" | "claro";
type Tamanho = "md" | "lg";

const variantes: Record<Variante, string> = {
  vermelho:
    "bg-dl-red text-white hover:bg-dl-red-hover shadow-lg shadow-dl-red/25 hover:shadow-dl-red/40",
  contorno:
    "border-2 border-white/25 text-white hover:border-white hover:bg-white/5",
  claro: "bg-dl-bone text-dl-ink hover:bg-white",
};

const tamanhos: Record<Tamanho, string> = {
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

const base = cn(
  "group relative inline-flex items-center justify-center gap-2.5 rounded-sm",
  "font-display font-bold uppercase tracking-[0.1em]",
  "transition-all duration-200 active:scale-[0.98]",
  "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-dl-red",
);

type Props = {
  href: string;
  children: React.ReactNode;
  variante?: Variante;
  tamanho?: Tamanho;
  className?: string;
  /** Links externos (WhatsApp, Maps, redes sociais) abrem em nova janela. */
  externo?: boolean;
};

export function Botao({
  href,
  children,
  variante = "vermelho",
  tamanho = "md",
  className,
  externo,
}: Props) {
  const classes = cn(base, variantes[variante], tamanhos[tamanho], className);

  if (externo) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
