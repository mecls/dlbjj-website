import "server-only";
import { createHash } from "node:crypto";
import { serviceClient } from "@/lib/supabase/service";
import { primeiroNome } from "@/lib/alunos/consultas";
import { dizer } from "./dizer";
import type { Lead } from "./types";

export function hashTelefone(phone: string): string {
  return createHash("sha256").update(phone).digest("hex");
}

/**
 * Opt-out (spec §3 D′, §6.2): guarda o hash para sempre, cancela as proativas
 * pendentes e confirma UMA vez. Um segundo pedido não recebe nada — já está
 * feito, e responder outra vez era mais uma mensagem a quem pediu silêncio.
 * A gravação acontece mesmo com o bot desligado; só a resposta depende dele.
 */
export async function registarOptOut(lead: Lead, texto: string, ligado: boolean): Promise<void> {
  const db = serviceClient();
  const { error } = await db
    .from("dlbjj_opt_outs")
    .insert({ phone_hash: hashTelefone(lead.phone), motivo: texto.slice(0, 200) });

  await db
    .from("dlbjj_fila_saida")
    .update({ estado: "cancelada", erro: "opt-out" })
    .eq("phone", lead.phone)
    .eq("kind", "proativa")
    .eq("estado", "pendente");

  if (error) {
    if (error.code === "23505") return; // já tinha opt-out: silêncio
    console.error("[optout] não gravou", error);
  }
  if (!ligado) return;

  const n = primeiroNome(lead.name);
  await dizer(
    lead,
    `Entendido${n ? `, ${n}` : ""}. Não voltamos a enviar-te mensagens. Se mudares de ideias, é só escrever. 🙏`,
  );
}
