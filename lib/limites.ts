import "server-only";
import { serviceClient } from "@/lib/supabase/service";

/**
 * Limite de pedidos por rota e IP, guardado na BD (dlbjj_limites) para valer
 * em todas as instâncias da Vercel. Devolve true quando o pedido pode passar.
 * Em falha da BD deixa passar e regista — um limite que fecha o login quando a
 * BD soluça é pior do que um que falha aberto por um minuto.
 */
export async function permitido(rota: string, ip: string, max: number, janelaSegundos: number): Promise<boolean> {
  const db = serviceClient();
  const { data, error } = await db.rpc("dlbjj_contar_limite", {
    p_chave: `${rota}:${ip}:${janelaSegundos}`,
    p_janela: `${janelaSegundos} seconds`,
  });
  if (error) {
    console.error("[limites] rpc falhou", error);
    return true;
  }
  return (data as number) <= max;
}

export function ipDe(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "local";
}
