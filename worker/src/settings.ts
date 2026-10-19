import type { Db } from "./db";

/** As definições afináveis sem deploy (dlbjj_settings), com os defaults da migração 003. */
export interface Definicoes {
  botLigado: boolean;
  proativasPorDia: number;
  janelaInicio: string;
  janelaFim: string;
  respostaAtrasoMediaS: number;
  respostaAtrasoDesvioS: number;
  proativaIntervaloMedioS: number;
  proativaIntervaloDesvioS: number;
  digitarWpm: number;
  humanoPausaHoras: number;
}

export const DEFINICOES_DEFAULT: Definicoes = {
  botLigado: true,
  proativasPorDia: 10,
  janelaInicio: "09:00",
  janelaFim: "21:00",
  respostaAtrasoMediaS: 8,
  respostaAtrasoDesvioS: 3,
  proativaIntervaloMedioS: 240,
  proativaIntervaloDesvioS: 90,
  digitarWpm: 40,
  humanoPausaHoras: 24,
};

export async function lerDefinicoes(db: Db): Promise<Definicoes> {
  const { data } = await db.from("dlbjj_settings").select("key,value");
  const m = new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const num = (k: string, d: number) => {
    const v = Number(m.get(k));
    return Number.isFinite(v) && v > 0 ? v : d;
  };
  return {
    botLigado: m.get("bot_enabled") !== "off",
    proativasPorDia: num("proativas_por_dia", DEFINICOES_DEFAULT.proativasPorDia),
    janelaInicio: m.get("janela_inicio") ?? DEFINICOES_DEFAULT.janelaInicio,
    janelaFim: m.get("janela_fim") ?? DEFINICOES_DEFAULT.janelaFim,
    respostaAtrasoMediaS: num("resposta_atraso_media_s", DEFINICOES_DEFAULT.respostaAtrasoMediaS),
    respostaAtrasoDesvioS: num("resposta_atraso_desvio_s", DEFINICOES_DEFAULT.respostaAtrasoDesvioS),
    proativaIntervaloMedioS: num("proativa_intervalo_medio_s", DEFINICOES_DEFAULT.proativaIntervaloMedioS),
    proativaIntervaloDesvioS: num("proativa_intervalo_desvio_s", DEFINICOES_DEFAULT.proativaIntervaloDesvioS),
    digitarWpm: num("digitar_wpm", DEFINICOES_DEFAULT.digitarWpm),
    humanoPausaHoras: num("humano_pausa_horas", DEFINICOES_DEFAULT.humanoPausaHoras),
  };
}
