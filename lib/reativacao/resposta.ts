import "server-only";
import { serviceClient } from "@/lib/supabase/service";

/**
 * A pessoa escreveu. Duas coisas, independentes:
 *  - um toque ENVIADO nos últimos 7 dias sem resposta fica respondido;
 *  - uma proativa ainda por sair é cancelada (já não é preciso lembrar quem
 *    acabou de falar connosco), e o seu toque fica `cancelada` — NÃO
 *    respondido, porque a mensagem nunca chegou; a regra volta a contar.
 */
export async function registarResposta(leadId: string, phone: string): Promise<void> {
  const db = serviceClient();
  const desde = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const agora = new Date().toISOString();

  const { data: toque } = await db
    .from("dlbjj_toques")
    .select("id,regra")
    .eq("phone", phone)
    .eq("estado", "enviada")
    .is("respondeu_em", null)
    .gte("enviada_em", desde)
    .order("enviada_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (toque) {
    await db.from("dlbjj_toques").update({ respondeu_em: agora }).eq("id", toque.id);
    await db.from("dlbjj_leads").update({ respondeu_regra_em: agora, ultima_regra: toque.regra }).eq("id", leadId);
  }

  await cancelarProativasPendentes(phone, "a pessoa escreveu antes do envio");
}

/** Cancela as proativas pendentes de um número e os toques que as esperavam. */
export async function cancelarProativasPendentes(phone: string, motivo: string): Promise<void> {
  const db = serviceClient();
  const { data: canceladas } = await db
    .from("dlbjj_fila_saida")
    .update({ estado: "cancelada", erro: motivo })
    .eq("phone", phone)
    .eq("kind", "proativa")
    .eq("estado", "pendente")
    .select("id");
  const ids = (canceladas ?? []).map((c) => c.id);
  if (ids.length) await db.from("dlbjj_toques").update({ estado: "cancelada" }).in("fila_id", ids).eq("estado", "na_fila");
}
