import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import { localPorSlug } from "@/content/site";
import { rankingAulas } from "@/lib/alunos/aulas";
import { descreverFaixa, faixaAtual, type Faixa } from "@/lib/alunos/faixas";
import { proximasAulas, type TurmaRow } from "@/lib/bot/checkin";
import { hojeLisboa, somarDias } from "@/lib/tempo";
import type { Escolha } from "./catalogo";

/**
 * As dez consultas de leitura (spec §5.4). Cada uma seleciona colunas
 * EXPLÍCITAS: nada de encarregado, saúde, contactos, NIF, morada, email,
 * telemóvel ou data de nascimento chega ao modelo.
 */
export type Linha = Record<string, string | number | null>;

const COL_ALUNO = "id,nome,local_slug,modalidade,publico,estado,inicio_em";
const nomeLocal = (slug: string | null) => (slug ? (localPorSlug(slug)?.nome ?? slug) : null);

async function faixasDe(ids: string[]) {
  const db = serviceClient();
  const { data } = await db.from("dlbjj_graduacoes").select("aluno_id,faixa,graus,atribuida_em,created_at").in("aluno_id", ids);
  const m = new Map<string, { faixa: Faixa; graus: number; atribuida_em: string; created_at: string }[]>();
  for (const g of data ?? []) (m.get(g.aluno_id) ?? m.set(g.aluno_id, []).get(g.aluno_id)!).push(g);
  return (id: string) => faixaAtual(m.get(id) ?? []);
}

async function ultimasPresencas(ids: string[]) {
  const db = serviceClient();
  const { data } = await db.from("dlbjj_presencas").select("aluno_id,data").in("aluno_id", ids).order("data", { ascending: false });
  const m = new Map<string, string>();
  for (const p of data ?? []) if (!m.has(p.aluno_id)) m.set(p.aluno_id, p.data);
  return (id: string) => m.get(id) ?? null;
}

async function alunosPorNome(nome: string, limite = 5) {
  const db = serviceClient();
  const { data } = await db
    .from("dlbjj_alunos")
    .select(COL_ALUNO)
    .ilike("nome", `%${nome.replace(/[%_]/g, "")}%`)
    .neq("estado", "anonimizado")
    .order("nome")
    .limit(limite);
  return data ?? [];
}

export async function executarFerramenta(e: Escolha): Promise<{ linhas: Linha[] }> {
  const db = serviceClient();
  const a = e.argumentos;

  switch (e.ferramenta) {
    case "contar_alunos": {
      let q = db.from("dlbjj_alunos").select("id", { count: "exact", head: true }).neq("estado", "anonimizado");
      if (a.academia) q = q.eq("local_slug", a.academia);
      if (a.estado) q = q.eq("estado", a.estado);
      if (a.modalidade) q = q.eq("modalidade", a.modalidade);
      if (a.publico) q = q.eq("publico", a.publico);
      const { count } = await q;
      return { linhas: [{ total: count ?? 0 }] };
    }
    case "listar_alunos": {
      let q = db.from("dlbjj_alunos").select(COL_ALUNO).neq("estado", "anonimizado").order("nome").limit(Number(a.limite ?? 20));
      if (a.academia) q = q.eq("local_slug", a.academia);
      if (a.estado) q = q.eq("estado", a.estado);
      const { data } = await q;
      const ids = (data ?? []).map((x) => x.id);
      const faixa = await faixasDe(ids);
      const ultima = await ultimasPresencas(ids);
      return {
        linhas: (data ?? [])
          .map((x) => ({ aluno: x, f: faixa(x.id) }))
          .filter(({ f }) => !a.faixa || f?.faixa === a.faixa)
          .map(({ aluno: x, f }) => ({ nome: x.nome, academia: nomeLocal(x.local_slug), faixa: descreverFaixa(f), estado: x.estado, ultimo_checkin: ultima(x.id) })),
      };
    }
    case "ficha_aluno": {
      const alunos = await alunosPorNome(String(a.nome));
      const ids = alunos.map((x) => x.id);
      const faixa = await faixasDe(ids);
      const ultima = await ultimasPresencas(ids);
      const desde = somarDias(hojeLisboa(), -30);
      const linhas: Linha[] = [];
      for (const x of alunos) {
        const { count } = await db.from("dlbjj_presencas").select("id", { count: "exact", head: true }).eq("aluno_id", x.id).gte("data", desde);
        const f = faixa(x.id);
        linhas.push({
          nome: x.nome,
          academia: nomeLocal(x.local_slug),
          modalidade: x.modalidade,
          publico: x.publico,
          faixa: f ? descreverFaixa(f).split(" · ")[0] : "—",
          graus: f?.graus ?? 0,
          faixa_desde: f?.atribuida_em ?? null,
          inicio_em: x.inicio_em,
          estado: x.estado,
          ultimo_checkin: ultima(x.id),
          presencas_30d: count ?? 0,
        });
      }
      return { linhas };
    }
    case "historico_faixas": {
      const alunos = await alunosPorNome(String(a.nome), 1);
      if (!alunos.length) return { linhas: [] };
      const { data } = await db.from("dlbjj_graduacoes").select("faixa,graus,atribuida_em,nota").eq("aluno_id", alunos[0].id).order("atribuida_em");
      return { linhas: (data ?? []).map((g) => ({ nome: alunos[0].nome, faixa: g.faixa, graus: g.graus, data: g.atribuida_em, nota: g.nota })) };
    }
    case "presencas_por_turma": {
      const r = await rankingAulas(Number(a.dias ?? 30));
      return { linhas: r.map((t) => ({ turma: t.turma, local: nomeLocal(t.local_slug), dias: t.dias, hora: t.horario.slice(0, 5), presencas: t.presencas, alunos: t.alunos })) };
    }
    case "presencas_aluno": {
      const alunos = await alunosPorNome(String(a.nome), 1);
      if (!alunos.length) return { linhas: [] };
      const { data } = await db
        .from("dlbjj_presencas")
        .select("data,origem,dlbjj_turmas(turma,horario)")
        .eq("aluno_id", alunos[0].id)
        .gte("data", somarDias(hojeLisboa(), -Number(a.dias ?? 30)))
        .order("data", { ascending: false });
      return {
        linhas: ((data ?? []) as unknown as { data: string; origem: string; dlbjj_turmas: { turma: string; horario: string } | null }[]).map((p) => ({
          nome: alunos[0].nome,
          data: p.data,
          turma: p.dlbjj_turmas ? `${p.dlbjj_turmas.turma} ${p.dlbjj_turmas.horario.slice(0, 5)}` : null,
          origem: p.origem,
        })),
      };
    }
    case "alunos_em_risco": {
      const dias = Number(a.dias ?? 14);
      const { data } = await db.from("dlbjj_alunos").select(COL_ALUNO).eq("estado", "ativo").order("nome");
      const ids = (data ?? []).map((x) => x.id);
      const ultima = await ultimasPresencas(ids);
      const hoje = hojeLisboa();
      const diasDesde = (d: string) => {
        const [y, m, dd] = d.split("-").map(Number);
        const [hy, hm, hd] = hoje.split("-").map(Number);
        return Math.round((Date.UTC(hy, hm - 1, hd) - Date.UTC(y, m - 1, dd)) / 86_400_000);
      };
      return {
        linhas: (data ?? [])
          .map((x) => {
            const ref = ultima(x.id) ?? x.inicio_em;
            return { nome: x.nome, academia: nomeLocal(x.local_slug), ultimo_checkin: ultima(x.id), dias_sem_treinar: ref ? diasDesde(ref) : null };
          })
          .filter((l) => l.dias_sem_treinar !== null && l.dias_sem_treinar >= dias)
          .sort((p, q) => (q.dias_sem_treinar ?? 0) - (p.dias_sem_treinar ?? 0)),
      };
    }
    case "leads_por_estado":
    case "leads_por_origem": {
      const desde = new Date(Date.now() - Number(a.dias ?? 30) * 86_400_000).toISOString();
      const { data } = await db.from("dlbjj_leads").select("status,origem").gte("first_contact_at", desde).not("phone", "like", "anon:%");
      const chave = e.ferramenta === "leads_por_estado" ? "status" : "origem";
      const contagem = new Map<string, number>();
      for (const l of data ?? []) {
        const k = (l[chave] as string | null) ?? "—";
        contagem.set(k, (contagem.get(k) ?? 0) + 1);
      }
      const linhas = [...contagem.entries()].map(([k, total]): Linha => (chave === "origem" ? { origem: k, total } : { estado: k, total }));
      return { linhas };
    }
    case "proximas_aulas": {
      const { data } = await db.from("dlbjj_turmas").select("*").eq("ativa", true);
      const turmas = (data ?? []) as TurmaRow[];
      const agora = new Date();
      const linhas: Linha[] = [];
      const locaisAlvo = a.academia ? [String(a.academia)] : [...new Set(turmas.map((t) => t.local_slug))];
      for (const slug of locaisAlvo) {
        for (const tipo of ["kids", "jiu-jitsu", "mma", "nogi"] as const) {
          const alunoFicticio = { id: "", nome: "", publico: tipo === "kids" ? ("kids" as const) : ("adulto" as const), modalidade: tipo === "kids" ? ("jiu-jitsu" as const) : tipo, local_slug: slug };
          for (const p of proximasAulas(alunoFicticio, turmas, agora, 5)) {
            if (!linhas.some((l) => l.dia === p.dia && l.hora === p.horario && l.turma === p.turma && l.local === nomeLocal(slug))) {
              linhas.push({ dia: p.dia, dia_semana: p.diaNome, hora: p.horario, turma: p.turma, local: nomeLocal(slug) });
            }
          }
        }
      }
      linhas.sort((x, y) => `${x.dia} ${x.hora}`.localeCompare(`${y.dia} ${y.hora}`));
      return { linhas: linhas.slice(0, 5) };
    }
  }
}
