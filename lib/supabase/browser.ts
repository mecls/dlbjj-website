"use client";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente anon do browser — usado apenas para as subscrições realtime no painel.
 * O RLS concede a `anon` SELECT em dlbjj_leads/dlbjj_mensagens; todas as escritas
 * passam por server actions com o cliente service-role.
 */
export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
