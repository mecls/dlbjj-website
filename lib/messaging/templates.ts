/**
 * Templates a submeter à Meta para aprovação (mensagens iniciadas pelo agente
 * fora da janela de 24h). Dentro da janela e no simulador, o motor envia o texto
 * livre + botões equivalentes, por isso o desenvolvimento não bloqueia na
 * aprovação.
 */

export interface TemplateSpec {
  name: string;
  category: "UTILITY";
  language: "pt_PT";
  body: string;
  buttons?: string[];
  variables: string[];
}

export const TEMPLATES: Record<string, TemplateSpec> = {
  // Reengajar quem começou o onboarding e não terminou (fora das 24h).
  retomar_onboarding: {
    name: "retomar_onboarding",
    category: "UTILITY",
    language: "pt_PT",
    body: "Olá {{1}}! Ficou a faltar pouco para marcar a tua aula grátis na Academia DL-BJJ. Queres continuar?",
    buttons: ["Continuar", "Agora não"],
    variables: ["nome"],
  },
};
