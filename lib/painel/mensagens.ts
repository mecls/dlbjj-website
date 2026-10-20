import "server-only";
import { serviceClient } from "@/lib/supabase/service";

/**
 * Conversas à espera do Daniel (design §6, §10): leads pausadas ou em
 * `humano` cuja mensagem mais recente — contando só as da pessoa (`lead`) e
 * as do Daniel (`humano`) — é de entrada. As linhas do bot (códigos de
 * login, mensagens de sistema) não contam como resposta.
 */
export async function conversasAEspera(): Promise<{ total: number; phones: string[] }> {
  const db = serviceClient();
  const { data: leads } = await db.from("dlbjj_leads").select("phone").or("paused.eq.true,status.eq.humano").not("phone", "like", "anon:%");
  const phones = (leads ?? []).map((l) => l.phone as string);
  if (phones.length === 0) return { total: 0, phones: [] };
  const { data: msgs } = await db
    .from("dlbjj_mensagens")
    .select("phone,direction,created_at")
    .in("phone", phones)
    .in("role", ["lead", "humano"])
    .order("created_at", { ascending: false });
  const vistos = new Set<string>();
  const espera: string[] = [];
  for (const m of msgs ?? []) {
    if (vistos.has(m.phone)) continue;
    vistos.add(m.phone);
    if (m.direction === "in") espera.push(m.phone);
  }
  return { total: espera.length, phones: espera };
}
