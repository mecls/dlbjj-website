import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MolduraEntrar } from "@/components/app/moldura-entrar";
import { Button } from "@/components/app/ui";
import { alunoPublicoPorId, primeiroNome } from "@/lib/alunos/consultas";
import { verificarToken } from "@/lib/tokens-db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Entrar — Área de aluno DL-BJJ",
  robots: { index: false, follow: false },
};

/**
 * O link que o bot envia com "perfil" (design §5.1). O GET só confirma — uma
 * pré-visualização do WhatsApp ou do gateway nunca o consome; é o botão
 * (POST /api/aluno/link) que gasta o token e abre a sessão. O proxy.ts já
 * devolveu 410/404 se o token não servia; aqui valida-se outra vez.
 */
export default async function LinkAluno({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { avaliacao, row } = await verificarToken(token, "perfil");
  if (!avaliacao.ok || !row?.aluno_id) notFound();
  const aluno = await alunoPublicoPorId(row.aluno_id);
  if (!aluno || aluno.estado === "anonimizado") notFound();

  return (
    <MolduraEntrar>
      <h1 className="text-xl font-bold">{`Entrar como ${primeiroNome(aluno.nome)}`}</h1>
      <p className="mt-1 text-sm text-app-muted">Este link é pessoal e serve uma vez. Ficas com sessão aberta neste aparelho durante 90 dias.</p>
      <form method="post" action="/api/aluno/link" className="mt-4">
        <input type="hidden" name="token" value={token} />
        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>
    </MolduraEntrar>
  );
}
