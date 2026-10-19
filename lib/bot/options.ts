/**
 * Uma opção escolhível numa pergunta do bot: uma linha numerada (ver
 * render.ts) e a forma de a reconhecer na resposta (ver resolve.ts). Os ids
 * são estáveis e o motor depende deles.
 */
export interface OutboundOption {
  id: string;
  title: string;
  description?: string;
}
