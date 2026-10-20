"use client";

import { useState } from "react";

/** Copia `texto` para a área de transferência e diz «Copiado» por dois segundos. */
export function Copiar({ texto }: { texto: string }) {
  const [feito, setFeito] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setFeito(true);
          setTimeout(() => setFeito(false), 2000);
        } catch {
          /* sem clipboard (http sem https, por exemplo): o endereço está visível ao lado */
        }
      }}
      className="shrink-0 rounded-lg border border-app-border px-3 py-1.5 text-sm font-medium hover:bg-app-soft"
    >
      {feito ? "Copiado" : "Copiar"}
    </button>
  );
}
