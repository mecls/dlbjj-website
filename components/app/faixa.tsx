import type { Faixa as Cor } from "@/lib/alunos/faixas";

const CORES: Record<Cor, string> = {
  branca: "#f4f4f5",
  cinzenta: "#9ca3af",
  amarela: "#facc15",
  laranja: "#f97316",
  verde: "#16a34a",
  azul: "#2563eb",
  roxa: "#7e22ce",
  castanha: "#78350f",
  preta: "#111827",
};

/** A faixa (96×28): banda na cor, ponta preta (vermelha na preta) e os graus em riscas brancas. */
export function Faixa({ faixa, graus, className }: { faixa: Cor; graus: number; className?: string }) {
  const ponta = faixa === "preta" ? "#ed1c24" : "#111827";
  return (
    <svg viewBox="0 0 96 28" width={96} height={28} className={className} role="img" aria-label={`Faixa ${faixa}${graus ? `, ${graus} graus` : ""}`}>
      <rect x="0" y="4" width="96" height="20" rx="3" fill={CORES[faixa]} stroke={faixa === "branca" ? "#d4d4d8" : "none"} />
      <rect x="62" y="4" width="28" height="20" fill={ponta} />
      {Array.from({ length: Math.min(graus, 4) }, (_, i) => (
        <rect key={i} x={66 + i * 6} y="4" width="3" height="20" fill="#ffffff" />
      ))}
    </svg>
  );
}
