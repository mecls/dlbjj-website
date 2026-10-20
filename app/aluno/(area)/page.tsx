import { localPorSlug } from "@/content/site";
import { Faixa } from "@/components/app/faixa";
import { Icone } from "@/components/app/icones";
import { StatCard } from "@/components/app/stat-card";
import { BotaoLink, Card, PageHeader, SectionTitle } from "@/components/app/ui";
import { faixaAtualDe, primeiroNome, turmasAtivas } from "@/lib/alunos/consultas";
import { descreverFaixa } from "@/lib/alunos/faixas";
import { turmasDoAluno } from "@/lib/bot/checkin";
import { contagensPorAluno, numerosAcademia, presencasDoAluno } from "@/lib/aluno/dados";
import { aulasDesdeInicio, aulasNoMes, descreverUltimaAula, diasSeguidos, mapaDeCalor, posicaoNoRanking, saudacaoAgora } from "@/lib/aluno/estatisticas";
import { requireAluno } from "@/lib/aluno/sessao";
import { mesAno } from "@/lib/datas-pt";
import { hojeLisboa } from "@/lib/tempo";

export const dynamic = "force-dynamic";

/** Início do aluno (design §5.2): faixa, membro desde, última aula, quatro números, a academia. */
export default async function InicioAluno() {
  const { aluno } = await requireAluno();
  const hoje = hojeLisboa();
  const [faixa, presencas, turmas, contagens, academia] = await Promise.all([
    faixaAtualDe(aluno.id),
    presencasDoAluno(aluno.id),
    turmasAtivas(),
    contagensPorAluno(`${hoje.slice(0, 7)}-01`),
    numerosAcademia(hoje),
  ]);
  const minhas = turmasDoAluno(aluno, turmas);
  const diasComAula = [...new Set(minhas.flatMap((t) => t.dias_semana))];
  const posicao = posicaoNoRanking(contagens, aluno.id);
  const ultima = presencas[0];
  const mapaAluno = mapaDeCalor(presencas, hoje, 12);
  const mapaAcademia = mapaDeCalor(academia.presencasRecentes, hoje, 12);
  const top = academia.turmaTop;

  return (
    <div className="space-y-8">
      <PageHeader titulo={`${saudacaoAgora()}, ${primeiroNome(aluno.nome)} 👋`}>
        <BotaoLink href="/aluno/calendario" variant="outline">
          <Icone nome="calendario" className="size-4" />
          Aulas de hoje
        </BotaoLink>
      </PageHeader>

      <Card className="p-7">
        <div className="flex items-center gap-5">
          {faixa ? <Faixa faixa={faixa.faixa} graus={faixa.graus} /> : null}
          <p className="text-xl font-bold">{faixa ? `Faixa ${descreverFaixa(faixa)}` : "Ainda sem faixa registada"}</p>
        </div>
        <div className="mt-6 space-y-1.5 text-[15px] text-app-muted">
          <p>{aluno.inicio_em ? `👤 Membro desde ${mesAno(aluno.inicio_em)}` : "👤 Membro desde —"}</p>
          <p>{ultima ? `🥋 Última aula: ${descreverUltimaAula(ultima.data, hoje)}` : "🥋 Ainda sem presenças"}</p>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icone="presencas" valor={aulasNoMes(presencas, hoje)} rotulo="Aulas este mês" href="/aluno/historico" mapa={mapaAluno} />
        <StatCard icone="historico" valor={aulasDesdeInicio(presencas)} rotulo="Aulas desde o início" sub={aluno.inicio_em ? `desde ${mesAno(aluno.inicio_em)}` : undefined} href="/aluno/historico" mapa={mapaAluno} />
        <StatCard icone="turma" valor={diasSeguidos(presencas, diasComAula, hoje)} rotulo="Dias seguidos" href="/aluno/historico" mapa={mapaAluno} />
        <StatCard icone="ranking" valor={posicao.posicao ? `${posicao.posicao}.º` : "—"} rotulo="Posição no ranking" sub={`de ${posicao.total} este mês`} href="/aluno/ranking" mapa={mapaAluno} />
      </div>

      <section className="space-y-4">
        <SectionTitle emoji="🏛">A minha academia</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard icone="calendario" valor={academia.aulasSemana} rotulo="Aulas esta semana" mapa={mapaAcademia} />
          <StatCard icone="presencas" valor={academia.presencasMes} rotulo="Presenças este mês" mapa={mapaAcademia} />
          <StatCard icone="alunos" valor={academia.alunosAtivos} rotulo="Alunos ativos" mapa={mapaAcademia} />
          <StatCard
            icone="turma"
            valor={top ? `${top.turma} · ${top.horario.slice(0, 5)}` : "—"}
            rotulo="Turma mais concorrida"
            sub={top ? `${top.dias} · ${localPorSlug(top.local_slug)?.nome ?? top.local_slug}` : undefined}
            mapa={mapaAcademia}
          />
        </div>
      </section>

      <p className="text-sm text-app-muted">
        Para marcar presença escreve <strong>presente</strong> no WhatsApp da academia.
      </p>
    </div>
  );
}
