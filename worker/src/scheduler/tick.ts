import { log } from "../log";
import { comJitter } from "../outbound/timing";

/**
 * Temporizadores com ±20 % de jitter e sem sobreposição: um tick que ainda
 * está a correr (uma drenagem pode demorar — os atrasos humanos estão lá
 * dentro) não é reentrado; o seguinte espera.
 */
export interface Temporizador {
  nome: string;
  intervaloMs: number;
  correr: () => Promise<void>;
}

export function iniciar(temporizadores: Temporizador[]): { parar: () => void; emCurso: () => number } {
  let parado = false;
  let emCurso = 0;
  const handles: NodeJS.Timeout[] = [];

  for (const t of temporizadores) {
    let aCorrer = false;
    const agendar = () => {
      if (parado) return;
      handles.push(
        setTimeout(async () => {
          if (parado) return;
          if (!aCorrer) {
            aCorrer = true;
            emCurso += 1;
            try {
              await t.correr();
            } catch (e) {
              log.error(`temporizador ${t.nome} falhou`, { error: e });
            } finally {
              aCorrer = false;
              emCurso -= 1;
            }
          }
          agendar();
        }, comJitter(t.intervaloMs)),
      );
    };
    agendar();
  }

  return {
    parar: () => {
      parado = true;
      for (const h of handles) clearTimeout(h);
    },
    emCurso: () => emCurso,
  };
}
