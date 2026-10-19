import type { NextRequest } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { campos, sessaoOu401, voltar } from "@/lib/painel/guard";

export const runtime = "nodejs";

/** O interruptor global (dlbjj_settings.bot_enabled). Desligar cancela o que está pendente (o worker fá-lo ao reclamar). */
export async function POST(req: NextRequest) {
  const bloqueio = await sessaoOu401();
  if (bloqueio) return bloqueio;
  const { um } = await campos(req);
  if (um.estado !== "on" && um.estado !== "off") return voltar("/painel/agente");
  await serviceClient().from("dlbjj_settings").upsert({ key: "bot_enabled", value: um.estado }, { onConflict: "key" });
  return voltar("/painel/agente", { ok: "1" });
}
