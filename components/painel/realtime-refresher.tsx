"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Mantém o painel vivo enquanto o motor escreve nas tabelas dlbjj_.
 *
 * Antes isto subscrevia o realtime do Supabase com a chave `anon`. Deixou de o
 * fazer: essa chave é pública (viaja para o browser) e, para o realtime
 * funcionar, o RLS tinha de deixar `anon` ler as leads todas — ou seja, os
 * nomes, telefones e conversas de toda a gente ficavam legíveis a quem tivesse
 * a chave. Ver supabase/migrations/002_dlbjj_rls.sql.
 *
 * Em troca, um `router.refresh()` de 10 em 10 segundos. O painel é uma página de
 * administração com um utilizador; o custo é irrelevante e nada no browser fala
 * com a base de dados. Pausa quando o separador está escondido, para não andar a
 * recarregar um painel que ninguém está a ver.
 */
const INTERVALO_MS = 10_000;

export function RealtimeRefresher() {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, INTERVALO_MS);
    // Ao voltar ao separador, atualiza já em vez de esperar pelo próximo ciclo.
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router]);

  return null;
}
