import { z } from "zod";
import { locais } from "@/content/site";
import { FAIXAS, type Faixa } from "@/lib/alunos/faixas";
import type { Modalidade, Publico } from "@/lib/bot/types";

/**
 * O formulário de inscrição (spec §3 B, §6.9). Puro: recebe os campos como
 * strings (FormData) e devolve dados tipados ou um mapa de erros por campo,
 * em pt-PT. A regra que mais importa: um menor NUNCA entra sem encarregado
 * de educação, e ninguém entra sem consentir o tratamento de dados.
 */
export const SLUGS = locais.map((l) => l.slug);
export const MODALIDADES = ["jiu-jitsu", "nogi", "mma"] as const;

export interface DadosInscricao {
  nome: string;
  data_nascimento: string;
  phone: string;
  email: string | null;
  morada: string | null;
  nif: string | null;
  publico: Publico;
  modalidade: Modalidade;
  local_slug: string;
  turma_preferida: string | null;
  experiencia_previa: string | null;
  enc_nome: string | null;
  enc_telefone: string | null;
  enc_relacao: string | null;
  contacto_emergencia_nome: string | null;
  contacto_emergencia_telefone: string | null;
  condicoes_saude: string | null;
  consentimento_imagem: boolean;
  faixa: Faixa;
  graus: number;
}

export type ResultadoValidacao = { ok: true; dados: DadosInscricao } | { ok: false; erros: Record<string, string> };

/** Dígito de controlo do NIF português (módulo 11). */
export function nifValido(nif: string): boolean {
  if (!/^\d{9}$/.test(nif)) return false;
  const d = nif.split("").map(Number);
  const soma = d.slice(0, 8).reduce((acc, n, i) => acc + n * (9 - i), 0);
  const resto = soma % 11;
  const controlo = resto < 2 ? 0 : 11 - resto;
  return controlo === d[8];
}

function idadeEm(nascimento: string, hoje: Date): number {
  const [y, m, d] = nascimento.split("-").map(Number);
  const hy = hoje.getUTCFullYear();
  const hm = hoje.getUTCMonth() + 1;
  const hd = hoje.getUTCDate();
  let idade = hy - y;
  if (hm < m || (hm === m && hd < d)) idade -= 1;
  return idade;
}

const limpo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const ouNull = (v: string): string | null => (v ? v : null);
const digitos = (v: string): string => v.replace(/\D/g, "");

/**
 * Telefones ficam em E.164 sem "+", só dígitos. Um número português escrito
 * à portuguesa (9 dígitos a começar por 9) ganha o 351; "00351…" perde o 00.
 * Devolve "" quando não dá para normalizar com confiança.
 */
export function normalizarTelefone(v: string): string {
  let d = digitos(v);
  if (d.startsWith("00")) d = d.slice(2);
  if (/^9\d{8}$/.test(d)) d = `351${d}`;
  return /^\d{11,15}$/.test(d) ? d : "";
}

const Esquema = z.object({
  nome: z.string().min(2, "Nome obrigatório").max(120),
  data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento obrigatória"),
  phone: z.string().regex(/^\d{11,15}$/, "Telemóvel inválido — inclui o indicativo (ex.: 351912345678)"),
  email: z.union([z.literal(""), z.string().email("Email inválido")]),
  local_slug: z.string().refine((s) => SLUGS.includes(s), "Espaço desconhecido"),
  modalidade: z.enum(MODALIDADES, { message: "Modalidade desconhecida" }),
  faixa: z.enum(FAIXAS, { message: "Faixa desconhecida" }),
  graus: z.coerce.number().int().min(0).max(4, "Graus entre 0 e 4"),
});

export function validarInscricao(campos: Record<string, unknown>, hoje: Date = new Date()): ResultadoValidacao {
  const erros: Record<string, string> = {};
  const c = Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, limpo(v)]));
  c.phone = normalizarTelefone(c.phone ?? "");
  c.nif = digitos(c.nif ?? "");

  const base = Esquema.safeParse({
    nome: c.nome ?? "",
    data_nascimento: c.data_nascimento ?? "",
    phone: c.phone,
    email: c.email ?? "",
    local_slug: c.local_slug ?? "",
    modalidade: c.modalidade ?? "",
    faixa: c.faixa ?? "",
    graus: c.graus || "0",
  });
  if (!base.success) {
    for (const issue of base.error.issues) {
      const campo = String(issue.path[0] ?? "");
      if (campo && !erros[campo]) erros[campo] = issue.message;
    }
  }

  let publico: Publico = "adulto";
  if (base.success) {
    const nasc = new Date(`${base.data.data_nascimento}T00:00:00Z`);
    if (Number.isNaN(nasc.getTime()) || nasc.getTime() > hoje.getTime()) {
      erros.data_nascimento = "Data de nascimento inválida";
    } else {
      const idade = idadeEm(base.data.data_nascimento, hoje);
      if (idade > 100) erros.data_nascimento = "Data de nascimento inválida";
      publico = idade < 18 ? "kids" : "adulto";
    }
  }

  if (publico === "kids" && !(c.enc_nome && c.enc_telefone && c.enc_relacao)) {
    erros.enc_nome = "Para menores é obrigatório o encarregado de educação";
  }
  if (c.nif && !nifValido(c.nif)) erros.nif = "NIF inválido";
  if (c.consentimento_rgpd !== "on" && c.consentimento_rgpd !== "true" && c.consentimento_rgpd !== "1") {
    erros.consentimento_rgpd = "É preciso aceitar o tratamento de dados (RGPD)";
  }

  if (Object.keys(erros).length > 0 || !base.success) return { ok: false, erros };

  return {
    ok: true,
    dados: {
      nome: base.data.nome,
      data_nascimento: base.data.data_nascimento,
      phone: base.data.phone,
      email: ouNull(base.data.email),
      morada: ouNull(c.morada ?? ""),
      nif: ouNull(c.nif),
      publico,
      modalidade: base.data.modalidade,
      local_slug: base.data.local_slug,
      turma_preferida: ouNull(c.turma_preferida ?? ""),
      experiencia_previa: ouNull(c.experiencia_previa ?? ""),
      enc_nome: ouNull(c.enc_nome ?? ""),
      enc_telefone: ouNull(normalizarTelefone(c.enc_telefone ?? "") || digitos(c.enc_telefone ?? "")),
      enc_relacao: ouNull(c.enc_relacao ?? ""),
      contacto_emergencia_nome: ouNull(c.contacto_emergencia_nome ?? ""),
      contacto_emergencia_telefone: ouNull(normalizarTelefone(c.contacto_emergencia_telefone ?? "") || digitos(c.contacto_emergencia_telefone ?? "")),
      condicoes_saude: ouNull(c.condicoes_saude ?? ""),
      consentimento_imagem: c.consentimento_imagem === "on" || c.consentimento_imagem === "true",
      faixa: base.data.faixa,
      graus: base.data.graus,
    },
  };
}
