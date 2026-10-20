import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { turmasAtivas } from "@/lib/alunos/consultas";
import { ESTILO_FORMULARIO, formularioHtml } from "@/lib/inscricao/formulario";

export const dynamic = "force-dynamic";

/** Criação manual (o mesmo formulário da inscrição, sem token, sem mensagem). */
export default async function NovoAlunoPage({ searchParams }: { searchParams?: Promise<{ erro?: string }> }) {
  await requireAuth();
  const { erro } = (await searchParams) ?? {};
  const turmas = await turmasAtivas();
  const html = formularioHtml({ action: "/api/painel/alunos", valores: {}, erros: {}, turmas });
  return (
    <div className="space-y-4">
      <Link href="/painel/alunos" className="text-sm text-app-muted hover:underline">
        ← Alunos
      </Link>
      <h1 className="text-[28px] font-bold tracking-tight text-app-text">Novo aluno</h1>
      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Não guardou: {erro}</p>}
      <style>{ESTILO_FORMULARIO}</style>
      <p className="text-sm text-app-muted">Data de início (opcional, por omissão hoje) vai no campo abaixo do formulário.</p>
      <div dangerouslySetInnerHTML={{ __html: html.replace('<button type="submit">', '<label>Data de início<input name="inicio_em" type="date"></label><button type="submit">') }} />
    </div>
  );
}
