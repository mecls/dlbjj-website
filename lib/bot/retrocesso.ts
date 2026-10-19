import "server-only";
import { serviceClient } from "@/lib/supabase/service";

/**
 * Uma entrada que falha a meio não pode ficar perdida (spec §14). A linha de
 * idempotência (dlbjj_mensagens) é escrita primeiro; se o trabalho a seguir
 * rebentar, apaga-se essa linha e o erro sobe — a rota responde 500, o
 * worker guarda a carta morta e volta a tentar, e à segunda a mesma
 * wa_message_id já não é tratada como duplicada.
 */
export async function comRetrocesso<T>(mensagemId: string | null, trabalho: () => Promise<T>): Promise<T> {
  try {
    return await trabalho();
  } catch (erro) {
    if (mensagemId) {
      const { error } = await serviceClient().from("dlbjj_mensagens").delete().eq("id", mensagemId);
      if (error) console.error("[inbound] não consegui apagar a linha de idempotência", error);
    }
    throw erro;
  }
}
