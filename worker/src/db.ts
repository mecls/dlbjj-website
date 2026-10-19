import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Cliente service-role (ignora RLS). O worker escreve na fila, no orçamento, na sessão e nas leads. */
export function criarDb(url: string, key: string): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false } });
}
export type Db = SupabaseClient;
