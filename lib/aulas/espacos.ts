import "server-only";
import { locais } from "@/content/site";
import { serviceClient } from "@/lib/supabase/service";
import { rankingAulasEntre, type LinhaRanking } from "@/lib/alunos/aulas";
import type { Periodo } from "./periodo";

export interface ResumoEspaco {
  slug: string;
  nome: string;
  morada: string | null;
  turmas: number;
  presencas: number;
  alunosAtivos: number;
}

/** Um cartão por espaço com turmas ativas (ajustes §2.4), na ordem de content/site.ts. */
export async function resumoPorEspaco(periodo: Periodo): Promise<{ espacos: ResumoEspaco[]; ranking: LinhaRanking[] }> {
  const [ranking, { data: alunos }] = await Promise.all([
    rankingAulasEntre(periodo.desde, periodo.ate),
    serviceClient().from("dlbjj_alunos").select("local_slug").eq("estado", "ativo"),
  ]);
  const ativosPor = new Map<string, number>();
  for (const a of alunos ?? []) if (a.local_slug) ativosPor.set(a.local_slug, (ativosPor.get(a.local_slug) ?? 0) + 1);
  const espacos = locais
    .map((l) => {
      const turmas = ranking.filter((t) => t.local_slug === l.slug);
      return { slug: l.slug, nome: l.nome, morada: l.morada, turmas: turmas.length, presencas: turmas.reduce((s, t) => s + t.presencas, 0), alunosAtivos: ativosPor.get(l.slug) ?? 0 };
    })
    .filter((e) => e.turmas > 0);
  return { espacos, ranking };
}
