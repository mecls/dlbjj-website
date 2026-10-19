import "server-only";
import { serviceClient } from "@/lib/supabase/service";

/**
 * A pessoa escreveu: se houve um toque nos últimos 7 dias sem resposta, fica
 * registado como respondido, e uma proativa ainda por sair para ela é
 * cancelada — já não é preciso lembrar quem acabou de falar connosco.
 */
export async function registarResposta(leadId: string, phone: string): Promise<void> {
  const db = serviceClient();
  const desde = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const { data: toque } = await db
    .from("dlbjj_toques")
    .select("id,regra")
    .eq("phone", phone)
    .is("respondeu_em", null)
    .neq("estado", "saltada")
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!toque) return;
  const agora = new Date().toISOString();
  await db.from("dlbjj_toques").update({ respondeu_em: agora }).eq("id", toque.id);
  await db.from("dlbjj_leads").update({ respondeu_regra_em: agora, ultima_regra: toque.regra }).eq("id", leadId);
  await db
    .from("dlbjj_fila_saida")
    .update({ estado: "cancelada", erro: "a pessoa escreveu antes do envio" })
    .eq("phone", phone)
    .eq("kind", "proativa")
    .eq("estado", "pendente");
}
