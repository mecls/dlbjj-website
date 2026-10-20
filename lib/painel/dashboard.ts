import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import type { LinhaRanking } from "@/lib/alunos/aulas";
import { numerosAcademia } from "@/lib/aluno/dados";
import type { PresencaDia } from "@/lib/aluno/estatisticas";
import { conversasAEspera } from "./mensagens";

export interface NumerosPainel {
  alunosAtivos: number;
  alunosInativos: number;
  presencasMes: number;
  inscricoesMes: number;
  conversasAEspera: number;
  toquesPendentes: number;
  aulasSemana: number;
  turmaTop: LinhaRanking | null;
  presencasRecentes: PresencaDia[];
}

/** Os números do Início do painel (design §6). */
export async function numerosDoPainel(hoje: string): Promise<NumerosPainel> {
  const db = serviceClient();
  const primeiroDoMes = `${hoje.slice(0, 7)}-01`;
  const [academia, { count: inativos }, { count: inscricoes }, espera, { count: toques }] = await Promise.all([
    numerosAcademia(hoje),
    db.from("dlbjj_alunos").select("*", { count: "exact", head: true }).eq("estado", "inativo"),
    db.from("dlbjj_alunos").select("*", { count: "exact", head: true }).gte("created_at", `${primeiroDoMes}T00:00:00Z`).neq("estado", "anonimizado"),
    conversasAEspera(),
    db.from("dlbjj_toques").select("*", { count: "exact", head: true }).eq("estado", "na_fila"),
  ]);
  return {
    alunosAtivos: academia.alunosAtivos,
    alunosInativos: inativos ?? 0,
    presencasMes: academia.presencasMes,
    inscricoesMes: inscricoes ?? 0,
    conversasAEspera: espera.total,
    toquesPendentes: toques ?? 0,
    aulasSemana: academia.aulasSemana,
    turmaTop: academia.turmaTop,
    presencasRecentes: academia.presencasRecentes,
  };
}
