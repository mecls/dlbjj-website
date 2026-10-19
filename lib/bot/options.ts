/**
 * Uma opção escolhível numa pergunta do bot. Antes vivia em
 * lib/messaging/provider.ts como "botão/linha de lista do WhatsApp"; agora é
 * só uma linha numerada (ver render.ts) e a forma de a reconhecer na resposta
 * (ver resolve.ts). Os ids são estáveis e o motor depende deles.
 */
export interface OutboundOption {
  id: string;
  title: string;
  description?: string;
}
