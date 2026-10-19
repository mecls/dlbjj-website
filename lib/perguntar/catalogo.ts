import { locais } from "@/content/site";
import { FAIXAS } from "@/lib/alunos/faixas";

/**
 * O catálogo FIXO de perguntas que o painel sabe responder (spec §5.4, §6.8).
 * O modelo escolhe um nome daqui e os argumentos; nunca escreve SQL. Um nome
 * fora da lista é "não sei responder".
 */
export const NOMES_FERRAMENTAS = [
  "contar_alunos",
  "listar_alunos",
  "ficha_aluno",
  "historico_faixas",
  "presencas_por_turma",
  "presencas_aluno",
  "alunos_em_risco",
  "leads_por_estado",
  "leads_por_origem",
  "proximas_aulas",
] as const;
export type NomeFerramenta = (typeof NOMES_FERRAMENTAS)[number];

export interface Escolha {
  ferramenta: NomeFerramenta;
  argumentos: Record<string, string | number>;
}

type Arg =
  | { tipo: "slug" }
  | { tipo: "estado" }
  | { tipo: "modalidade" }
  | { tipo: "publico" }
  | { tipo: "faixa" }
  | { tipo: "nome"; obrigatorio: true }
  | { tipo: "limite"; max: number; porOmissao: number }
  | { tipo: "periodo"; porOmissao: number }
  | { tipo: "dias"; porOmissao: number };

export const DESCRICOES: Record<NomeFerramenta, { descricao: string; args: Record<string, Arg> }> = {
  contar_alunos: { descricao: "Quantos alunos há (por academia, estado, modalidade, kids/adulto).", args: { academia: { tipo: "slug" }, estado: { tipo: "estado" }, modalidade: { tipo: "modalidade" }, publico: { tipo: "publico" } } },
  listar_alunos: { descricao: "Lista de alunos com faixa e último check-in.", args: { academia: { tipo: "slug" }, estado: { tipo: "estado" }, faixa: { tipo: "faixa" }, limite: { tipo: "limite", max: 50, porOmissao: 20 } } },
  ficha_aluno: { descricao: "A ficha de um aluno pelo nome (faixa, academia, início, presenças).", args: { nome: { tipo: "nome", obrigatorio: true } } },
  historico_faixas: { descricao: "As graduações de um aluno, com datas.", args: { nome: { tipo: "nome", obrigatorio: true } } },
  presencas_por_turma: { descricao: "Ranking das aulas por presenças (30, 90 ou 365 dias).", args: { dias: { tipo: "periodo", porOmissao: 30 } } },
  presencas_aluno: { descricao: "As presenças de um aluno nos últimos N dias.", args: { nome: { tipo: "nome", obrigatorio: true }, dias: { tipo: "dias", porOmissao: 30 } } },
  alunos_em_risco: { descricao: "Alunos ativos sem presença há N dias.", args: { dias: { tipo: "dias", porOmissao: 14 } } },
  leads_por_estado: { descricao: "Leads dos últimos N dias por estado.", args: { dias: { tipo: "dias", porOmissao: 30 } } },
  leads_por_origem: { descricao: "Leads dos últimos N dias por como nos conheceram.", args: { dias: { tipo: "dias", porOmissao: 30 } } },
  proximas_aulas: { descricao: "As próximas 5 aulas (opcionalmente numa academia).", args: { academia: { tipo: "slug" } } },
};

const SLUGS = new Set(locais.map((l) => l.slug));
const ESTADOS = new Set(["ativo", "inativo", "ex_aluno"]);
const MODALIDADES = new Set(["jiu-jitsu", "nogi", "mma"]);

function normalizarSlug(v: string): string | null {
  const t = v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  if (SLUGS.has(t)) return t;
  const porNome = locais.find((l) => l.nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() === t);
  if (porNome) return porNome.slug;
  if (t.includes("kids")) return "kids-amadora";
  if (t.includes("bras")) return "sao-bras";
  if (t.includes("queluz")) return "queluz";
  return null;
}

export function validarEscolha(bruto: unknown): Escolha | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as { ferramenta?: unknown; argumentos?: unknown };
  if (typeof o.ferramenta !== "string" || !(NOMES_FERRAMENTAS as readonly string[]).includes(o.ferramenta)) return null;
  const nome = o.ferramenta as NomeFerramenta;
  const dados = (o.argumentos && typeof o.argumentos === "object" ? o.argumentos : {}) as Record<string, unknown>;
  const args: Record<string, string | number> = {};

  for (const [chave, spec] of Object.entries(DESCRICOES[nome].args)) {
    const v = dados[chave];
    const s = typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
    switch (spec.tipo) {
      case "slug": {
        const slug = s ? normalizarSlug(s) : null;
        if (slug) args[chave] = slug;
        break;
      }
      case "estado":
        if (ESTADOS.has(s)) args[chave] = s;
        break;
      case "modalidade":
        if (MODALIDADES.has(s)) args[chave] = s;
        break;
      case "publico":
        if (s === "kids" || s === "adulto") args[chave] = s;
        break;
      case "faixa":
        if ((FAIXAS as readonly string[]).includes(s)) args[chave] = s;
        break;
      case "nome":
        if (!s) return null;
        args[chave] = s.slice(0, 80);
        break;
      case "limite": {
        const n = Number(s);
        args[chave] = Number.isInteger(n) && n > 0 ? Math.min(n, spec.max) : spec.porOmissao;
        break;
      }
      case "periodo": {
        const n = Number(s);
        args[chave] = [30, 90, 365].includes(n) ? n : spec.porOmissao;
        break;
      }
      case "dias": {
        const n = Number(s);
        args[chave] = Number.isInteger(n) && n >= 1 && n <= 365 ? n : spec.porOmissao;
        break;
      }
    }
  }
  return { ferramenta: nome, argumentos: args };
}

/** O catálogo em texto, para o prompt do modelo. */
export function catalogoParaPrompt(): string {
  return NOMES_FERRAMENTAS.map((n) => {
    const d = DESCRICOES[n];
    const args = Object.entries(d.args)
      .map(([k, a]) => `${k}${"obrigatorio" in a ? " (obrigatório)" : ""}: ${a.tipo}`)
      .join(", ");
    return `- ${n}: ${d.descricao} Argumentos: ${args || "nenhum"}.`;
  }).join("\n");
}
