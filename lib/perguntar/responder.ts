import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import { validarEscolha } from "./catalogo";
import { executarFerramenta } from "./ferramentas";
import { escolherFerramenta, formatarResposta } from "./llm";

export const RECUSA =
  "Não sei responder a isso com os dados que tenho. Posso dizer-te: alunos por academia, faixa de um aluno, presenças por turma, quem está em risco, leads por origem.";

export interface Resposta {
  resposta: string;
  ferramenta: string | null;
  linhas: number;
  duracaoMs: number;
}

/** Pergunta → ferramenta validada → linhas → texto, tudo registado em dlbjj_perguntas. */
export async function responder(pergunta: string): Promise<Resposta> {
  const t0 = Date.now();
  const escolha = validarEscolha(await escolherFerramenta(pergunta));
  let r: Resposta;
  if (!escolha) {
    r = { resposta: RECUSA, ferramenta: null, linhas: 0, duracaoMs: Date.now() - t0 };
  } else {
    const { linhas } = await executarFerramenta(escolha);
    const texto = await formatarResposta(pergunta, escolha, linhas);
    r = { resposta: texto, ferramenta: escolha.ferramenta, linhas: linhas.length, duracaoMs: Date.now() - t0 };
  }
  await serviceClient().from("dlbjj_perguntas").insert({
    pergunta: pergunta.slice(0, 500),
    ferramenta: r.ferramenta,
    argumentos: escolha?.argumentos ?? null,
    linhas: r.linhas,
    resposta: r.resposta,
    duracao_ms: r.duracaoMs,
  });
  return r;
}
