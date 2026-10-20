/**
 * Como o proxy diz à página de link inválido o que se passou. Vai na query E
 * em cabeçalhos de pedido: um `next dev` arrancado sem `-H` deita fora a
 * query de uma reescrita (a de `next dev -H 127.0.0.1` e a de produção
 * chegam inteiras), e a página tem de acertar nas duas situações.
 */
export const CABECALHO_KIND = "x-dlbjj-kind";
export const CABECALHO_MOTIVO = "x-dlbjj-motivo";
