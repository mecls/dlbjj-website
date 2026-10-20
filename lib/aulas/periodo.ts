import { diaCurto } from "@/lib/datas-pt";
import { somarDias } from "@/lib/tempo";

/**
 * O período das páginas de aulas: hoje, 7, 30 (por omissão) ou 90 dias, ou um
 * intervalo à escolha (`?desde=&ate=`). Puro; o que não se percebe cai nos 30.
 */
export interface Periodo {
  desde: string;
  ate: string;
  chave: "hoje" | "7" | "30" | "90" | "personalizado";
  rotulo: string;
  query: string;
}

export const PRESETS: { chave: Periodo["chave"]; label: string }[] = [
  { chave: "hoje", label: "Hoje" },
  { chave: "7", label: "7 dias" },
  { chave: "30", label: "30 dias" },
  { chave: "90", label: "90 dias" },
];

const DIA = /^\d{4}-\d{2}-\d{2}$/;

function diaReal(d: string): boolean {
  const [y, m, dd] = d.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === dd;
}

export function periodoDe(sp: { dias?: string; desde?: string; ate?: string }, hoje: string): Periodo {
  const { desde, ate } = sp;
  if (desde && ate && DIA.test(desde) && DIA.test(ate) && diaReal(desde) && diaReal(ate) && desde <= ate) {
    return { desde, ate, chave: "personalizado", rotulo: `${diaCurto(desde)} – ${diaCurto(ate)}`, query: `desde=${desde}&ate=${ate}` };
  }
  if (sp.dias === "hoje") return { desde: hoje, ate: hoje, chave: "hoje", rotulo: "hoje", query: "dias=hoje" };
  const n = sp.dias === "7" ? 7 : sp.dias === "90" ? 90 : 30;
  const chave = String(n) as "7" | "30" | "90";
  return { desde: somarDias(hoje, -n), ate: hoje, chave, rotulo: `${n} dias`, query: `dias=${n}` };
}
