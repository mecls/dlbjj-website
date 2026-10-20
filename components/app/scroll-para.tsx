"use client";

import { useEffect } from "react";

/** No telemóvel, leva o elemento `id` para o meio do ecrã ao abrir a página (a linha do próprio no ranking). */
export function ScrollPara({ id }: { id: string }) {
  useEffect(() => {
    if (window.innerWidth >= 1024) return;
    document.getElementById(id)?.scrollIntoView({ block: "center" });
  }, [id]);
  return null;
}
