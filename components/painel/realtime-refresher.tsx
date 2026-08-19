"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";

/**
 * Subscreve mudanças no Postgres e recarrega a árvore de server components para
 * o painel ficar vivo à medida que o motor escreve nas tabelas dlbjj_.
 */
export function RealtimeRefresher() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return; // Supabase não configurado (dev) → sem realtime
    }
    const supabase = browserClient();
    const debouncedRefresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 250);
    };

    const channel = supabase
      .channel("dlbjj-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dlbjj_leads" },
        debouncedRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dlbjj_mensagens" },
        debouncedRefresh,
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
