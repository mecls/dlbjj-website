/**
 * Logs em JSON, uma linha por evento, para o `docker logs` e para quem os
 * agregar. Telefones são sempre redigidos: um log de produção não é sítio para
 * o número de ninguém.
 */
type Nivel = "debug" | "info" | "warn" | "error";
const ORDEM: Record<Nivel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function nivelAtual(): number {
  const n = (process.env.LOG_LEVEL ?? "info") as Nivel;
  return ORDEM[n] ?? ORDEM.info;
}

export function redigirTelefone(valor: string | null | undefined): string {
  if (!valor) return "—";
  const digitos = valor.replace(/@.*$/, "").replace(/\D/g, "");
  if (digitos.length < 6) return "…";
  return `${digitos.slice(0, 3)}…${digitos.slice(-3)}`;
}

function serializar(valor: unknown): unknown {
  if (valor instanceof Error) return { name: valor.name, message: valor.message, ...("status" in valor ? { status: (valor as { status: unknown }).status } : {}) };
  return valor;
}

function escrever(nivel: Nivel, msg: string, campos?: Record<string, unknown>): void {
  if (ORDEM[nivel] < nivelAtual()) return;
  const linha = {
    t: new Date().toISOString(),
    nivel,
    msg,
    ...(campos ? Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, serializar(v)])) : {}),
  };
  const texto = JSON.stringify(linha);
  if (nivel === "error" || nivel === "warn") process.stderr.write(texto + "\n");
  else process.stdout.write(texto + "\n");
}

export const log = {
  debug: (msg: string, campos?: Record<string, unknown>) => escrever("debug", msg, campos),
  info: (msg: string, campos?: Record<string, unknown>) => escrever("info", msg, campos),
  warn: (msg: string, campos?: Record<string, unknown>) => escrever("warn", msg, campos),
  error: (msg: string, campos?: Record<string, unknown>) => escrever("error", msg, campos),
};
