import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A chave privada do feed ICS (ajustes §2.5): derivada da password do painel,
 * por isso muda quando a password muda e não há nada novo a configurar.
 */
export function chaveIcs(): string | null {
  const pw = process.env.DASHBOARD_PASSWORD;
  if (!pw) return null;
  return createHmac("sha256", pw).update("dlbjj-eventos-ics").digest("hex");
}

export function chaveValida(dada: string | null): boolean {
  const esperada = chaveIcs();
  if (!esperada || !dada || dada.length !== esperada.length) return false;
  return timingSafeEqual(Buffer.from(dada), Buffer.from(esperada));
}
