import Link from "next/link";
import type { CelulaCalor } from "@/lib/aluno/estatisticas";
import { Card } from "./ui";
import { Icone, type IconeNome } from "./icones";
import { MapaDeCalor } from "./heatmap";

/**
 * Cartão de número (design §4): ícone, mapa de calor à direita, número grande,
 * rótulo. Ordem no DOM: mapa, ícone, número, rótulo — os testes procuram
 * `>valor<` a poucas dezenas de caracteres do rótulo.
 */
export function StatCard({ icone, valor, rotulo, sub, href, mapa }: { icone: IconeNome; valor: string | number; rotulo: string; sub?: string; href?: string; mapa?: CelulaCalor[] }) {
  const corpo = (
    <Card className="relative h-full overflow-hidden p-6 transition hover:border-app-icon/40">
      {mapa ? <MapaDeCalor celulas={mapa} className="pointer-events-none absolute right-5 top-5 [mask-image:linear-gradient(to_right,transparent,black_40%)]" /> : null}
      <Icone nome={icone} className="size-7 text-app-icon" />
      <p className={typeof valor === "string" && valor.length > 8 ? "relative mt-8 text-[22px] font-bold leading-tight text-app-text" : "mt-8 text-[32px] font-bold leading-none text-app-text"}>{valor}</p>
      <p className="mt-2 text-[15px] text-app-muted">{rotulo}</p>
      {sub ? <p className="text-[13px] text-app-muted">{sub}</p> : null}
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {corpo}
    </Link>
  ) : (
    corpo
  );
}
