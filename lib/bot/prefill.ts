/**
 * Lê a primeira mensagem à procura do formulário que o PRÓPRIO site pré-preenche.
 *
 * O botão "Marcar aula grátis" abre o WhatsApp com este texto já escrito
 * (content/site.ts → `whatsappMensagem`):
 *
 *     Olá! Vi o site da Academia DL-BJJ e gostaria de marcar uma aula
 *     experimental grátis.
 *
 *     Nome:
 *     Modalidade (Jiu-Jitsu / NoGi / MMA):
 *     Local (Queluz / São Brás):
 *
 * Quem preenche e envia está a responder a perguntas que o bot fazia logo a
 * seguir. Isto só reconhece os rótulos do nosso próprio template — não tenta
 * adivinhar texto livre, que é trabalho do LLM.
 */

export interface Prefill {
  nome: string | null;
  /** Em bruto, como a pessoa escreveu. Fica na ficha e dá contexto ao LLM. */
  modalidade: string | null;
  local: string | null;
}

/**
 * `[^\S\n]` é "espaço branco menos a mudança de linha". Com `\s*` normal, um
 * campo vazio ("Nome:") atravessava a linha e capturava a seguinte — o nome
 * ficava a ser "Modalidade (Jiu-Jitsu / NoGi / MMA): ...".
 */
function campo(rotulo: string): RegExp {
  return new RegExp(`^[^\\S\\n]*${rotulo}[^:\\n]*:[^\\S\\n]*(.+)$`, "im");
}

function valor(texto: string, rotulo: string): string | null {
  const bruto = texto.match(campo(rotulo))?.[1]?.trim();
  if (!bruto) return null;
  // Um valor com ":" é quase de certeza a linha seguinte apanhada por engano.
  if (bruto.includes(":")) return null;
  const limpo = bruto.replace(/\s+/g, " ").slice(0, 80);
  return limpo.length ? limpo : null;
}

export function parsePrefill(texto: string): Prefill {
  if (!texto.includes(":")) return { nome: null, modalidade: null, local: null };
  return {
    nome: valor(texto, "Nome"),
    modalidade: valor(texto, "Modalidade"),
    local: valor(texto, "Local"),
  };
}
