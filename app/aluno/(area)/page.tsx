import { PageHeader } from "@/components/app/ui";
import { primeiroNome } from "@/lib/alunos/consultas";
import { saudacaoAgora } from "@/lib/aluno/estatisticas";
import { requireAluno } from "@/lib/aluno/sessao";

export const dynamic = "force-dynamic";

/** Início do aluno — esqueleto; a Tarefa 6 põe aqui a faixa, os números e a academia. */
export default async function InicioAluno() {
  const { aluno } = await requireAluno();
  return <PageHeader titulo={`${saudacaoAgora()}, ${primeiroNome(aluno.nome)} 👋`} />;
}
