/**
 * O que a linha de dlbjj_sessao diz sobre o worker (design dos ajustes §2.1):
 * uma sessão «ligado» cujo batimento parou há mais de 10 minutos é um worker
 * que morreu, não uma sessão boa; sem linha nenhuma, em produção, o worker
 * nunca arrancou (em dev e nos testes é o normal e não alerta).
 */
export type EstadoSessao = "ligada" | "instavel" | "caida" | "sem_sinal" | "nunca";

export const SEM_SINAL_MS = 10 * 60_000;

export function estadoDaSessao(row: { estado: string; visto_em: string } | null, agora: Date, producao: boolean): { estado: EstadoSessao; alerta: boolean } {
  if (!row) return { estado: "nunca", alerta: producao };
  if (row.estado === "caido") return { estado: "caida", alerta: true };
  if (row.estado === "instavel") return { estado: "instavel", alerta: true };
  if (agora.getTime() - new Date(row.visto_em).getTime() > SEM_SINAL_MS) return { estado: "sem_sinal", alerta: true };
  return { estado: "ligada", alerta: false };
}
