import Image from "next/image";
import { cn } from "@/lib/utils";

/** O logótipo (preto sobre branco) — o wordmark tem letras brancas e desaparece em fundo claro. */
export function Logotipo({ className }: { className?: string }) {
  return <Image src="/brand/logo.png" alt="DL-BJJ" width={80} height={80} unoptimized className={cn("h-20 w-auto", className)} />;
}
