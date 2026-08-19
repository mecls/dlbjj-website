import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente service-role — ignora RLS. Usado pelo webhook, pelo motor e pelas
 * server actions do painel (tudo do lado do servidor). A service key nunca pode
 * chegar ao browser; importar isto só a partir de código de servidor.
 *
 * Aponta para o MESMO projeto Supabase da waldi; as tabelas da academia têm
 * prefixo `dlbjj_` para não colidir com as tabelas do waldi-mvp.
 */
let cached: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  return cached;
}
