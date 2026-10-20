/** Nomes e formatos de datas em pt-PT a partir de "YYYY-MM-DD" (calendário, sem fuso). */
export const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** Índice 0 = segunda … 6 = domingo (ISO − 1). */
export const DIAS_CURTOS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function partes(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d: d || 1 };
}

/** "19 de outubro de 2026" */
export function dataPt(iso: string): string {
  const { y, m, d } = partes(iso);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

/** "19 de outubro" */
export function diaMes(iso: string): string {
  const { m, d } = partes(iso);
  return `${d} de ${MESES[m - 1]}`;
}

/** "outubro de 2026" — aceita "YYYY-MM" ou "YYYY-MM-DD". */
export function mesAno(iso: string): string {
  const { y, m } = partes(iso);
  return `${MESES[m - 1]} de ${y}`;
}

/** "seg 19 out" */
export function diaCurto(iso: string): string {
  const { y, m, d } = partes(iso);
  const ds = ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7);
  return `${DIAS_CURTOS[ds]} ${d} ${MESES_CURTOS[m - 1]}`;
}
