import { normalizarTexto } from "./resolve";

/**
 * Palavras-chave deterministas (spec §5.2, §5.3). Correm ANTES do guião e de
 * qualquer chamada ao modelo, mesmo com a conversa pausada para humano.
 */

const OPT_OUT_FRASES = [
  "nao quero mais mensagens",
  "nao quero receber",
  "nao quero mais contacto",
  "nao quero que me",
  "nao me mandes",
  "nao me mandem",
  "nao enviem",
  "nao me enviem",
  "remover",
  "remove me",
  "cancelar mensagens",
  "deixa me em paz",
  "deixem me em paz",
  "para de me mandar",
  "para de mandar",
  "para de enviar",
  "para de me enviar",
  "para de me escrever",
  "para de insistir",
  "parem de mandar",
  "parem de enviar",
];
/** Valem sozinhas (a mensagem inteira), não dentro de uma frase. */
const OPT_OUT_SOZINHAS = new Set(["parar", "para", "stop", "remover", "cancelar", "basta", "chega"]);

/**
 * "não quero" e "para de" só contam com contexto de mensagens — senão "não quero
 * MMA, quero jiu-jitsu" a meio do guião fazia opt-out de um cliente.
 * No passo do nome, uma frase longa nunca é opt-out: é um nome ou uma
 * apresentação, e "parar" pode estar lá por acaso.
 */
export function isOptOut(texto: string, step?: string): boolean {
  const t = normalizarTexto(texto);
  if (!t) return false;
  if (step === "nome" && texto.trim().length > 40) return false;
  if (OPT_OUT_SOZINHAS.has(t)) return true;
  return OPT_OUT_FRASES.some((f) => t.includes(f));
}

const CHECKIN = new Set([
  "presente",
  "cheguei",
  "check in",
  "checkin",
  "estou aqui",
  "to aqui",
  "tou aqui",
  "vou treinar",
  "treinei",
  "presenca",
]);

/** A mensagem É uma das palavras de check-in (pontuação e emoji à parte). */
export function isCheckin(texto: string): boolean {
  return CHECKIN.has(normalizarTexto(texto));
}

const PERFIL = new Set(["perfil", "a minha ficha", "minha ficha", "a minha faixa", "minha faixa", "o meu perfil", "meu perfil"]);

export function isPerfil(texto: string): boolean {
  return PERFIL.has(normalizarTexto(texto));
}
