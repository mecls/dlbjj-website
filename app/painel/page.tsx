import { localPorSlug } from "@/content/site";
import { Icone } from "@/components/app/icones";
import { StatCard } from "@/components/app/stat-card";
import { BotaoLink, Card, PageHeader, SectionTitle } from "@/components/app/ui";
import { requireAuth } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/config";
import { mapaDeCalor, saudacaoAgora } from "@/lib/aluno/estatisticas";
import { numerosDoPainel } from "@/lib/painel/dashboard";
import { hojeLisboa } from "@/lib/tempo";

export const dynamic = "force-dynamic";

/** Início do painel (design §6; ajustes §2.1): os números da academia e o que está à espera do Daniel. O agente vive em /painel/agente. */
export default async function PainelInicio() {
  await requireAuth();
  if (!supabaseConfigured()) {
    return (
      <Card className="p-6">
        <h1 className="text-lg font-semibold">Falta configurar o Supabase</h1>
        <p className="mt-2 text-sm text-app-muted">
          Define <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>SUPABASE_SERVICE_ROLE_KEY</code> em <code>.env.local</code> e aplica as migrações em <code>supabase/migrations/</code>.
        </p>
      </Card>
    );
  }
  const hoje = hojeLisboa();
  const n = await numerosDoPainel(hoje);
  const mapa = mapaDeCalor(n.presencasRecentes, hoje, 12);
  const top = n.turmaTop;

  return (
    <div className="space-y-8">
      <PageHeader titulo={`${saudacaoAgora()}, Daniel 👋`}>
        <BotaoLink href="/painel/aulas" variant="outline">
          <Icone nome="calendario" className="size-4" />
          Aulas de hoje
        </BotaoLink>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icone="alunos" valor={n.alunosAtivos} rotulo="Alunos ativos" href="/painel/alunos" mapa={mapa} />
        <StatCard icone="presencas" valor={n.presencasMes} rotulo="Presenças este mês" href="/painel/aulas" mapa={mapa} />
        <StatCard icone="inscricoes" valor={n.inscricoesMes} rotulo="Inscrições este mês" href="/painel/alunos" mapa={mapa} />
        <StatCard icone="mensagens" valor={n.conversasAEspera} rotulo="Conversas à espera" href="/painel/mensagens" mapa={mapa} />
      </div>

      <section className="space-y-4">
        <SectionTitle emoji="🏛">A minha academia</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard icone="calendario" valor={n.aulasSemana} rotulo="Aulas esta semana" href="/painel/aulas" mapa={mapa} />
          <StatCard
            icone="turma"
            valor={top ? `${top.turma} · ${top.horario.slice(0, 5)}` : "—"}
            rotulo="Turma mais concorrida (30 dias)"
            sub={top ? `${top.dias} · ${localPorSlug(top.local_slug)?.nome ?? top.local_slug}` : undefined}
            href="/painel/aulas"
            mapa={mapa}
          />
          <StatCard icone="reativacao" valor={n.alunosInativos} rotulo="Alunos inativos" href="/painel/reativacao" mapa={mapa} />
          <StatCard icone="reativacao" valor={n.toquesPendentes} rotulo="Reativações por enviar" sub="mensagens automáticas agendadas" href="/painel/reativacao" mapa={mapa} />
        </div>
      </section>
    </div>
  );
}
