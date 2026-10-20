import type { Metadata } from "next";
import Link from "next/link";
import { MolduraEntrar } from "@/components/app/moldura-entrar";
import { Button, Input, Label, Rotulo } from "@/components/app/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Entrar — Área de aluno DL-BJJ",
  robots: { index: false, follow: false },
};

const ERROS: Record<string, string> = {
  telefone: "Número inválido. Usa o telemóvel com que te inscreveste.",
  limite: "Demasiados pedidos. Tenta mais tarde.",
  bot: "O envio de códigos está desligado de momento. Fala com a academia.",
  sessao: "O WhatsApp da academia está em baixo de momento. Tenta mais tarde.",
  codigo: "Código errado ou expirado.",
  bloqueado: "Demasiadas tentativas. Pede um código novo.",
  link: "Este link já foi usado ou expirou. Pede um novo com perfil no WhatsApp ou entra com o teu número.",
};

/** Entrar na área do aluno (design §5.1): telemóvel → código pelo WhatsApp → sessão. */
export default async function EntrarPage({ searchParams }: { searchParams?: Promise<{ passo?: string; erro?: string }> }) {
  const { passo, erro } = (await searchParams) ?? {};
  const mensagem = erro ? ERROS[erro] : null;
  const passoCodigo = passo === "codigo";

  return (
    <MolduraEntrar>
      <h1 className="text-xl font-bold">{passoCodigo ? "Código" : "Área de aluno"}</h1>
      <p className="mt-1 text-sm text-app-muted">
        {passoCodigo ? "Se este número tiver ficha de aluno, vais receber um código no WhatsApp." : "Escreve o telemóvel com que te inscreveste. Vais receber um código no WhatsApp."}
      </p>
      {mensagem ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensagem}</p> : null}
      {passoCodigo ? (
        <form method="post" action="/api/aluno/entrar" className="mt-4 space-y-3">
          <Label>
            <Rotulo>Código</Rotulo>
            <Input name="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]*" autoFocus required placeholder="000000" />
          </Label>
          <Button type="submit" className="w-full">
            Entrar
          </Button>
          <p className="text-center text-sm">
            <Link href="/aluno/entrar" className="text-app-muted underline hover:text-app-text">
              Pedir outro código
            </Link>
          </p>
        </form>
      ) : (
        <form method="post" action="/api/aluno/codigo" className="mt-4 space-y-3">
          <Label>
            <Rotulo>O teu número de telemóvel</Rotulo>
            <Input name="telefone" type="tel" inputMode="tel" autoComplete="tel" autoFocus required placeholder="9xx xxx xxx" />
          </Label>
          <Button type="submit" className="w-full">
            Enviar código
          </Button>
        </form>
      )}
    </MolduraEntrar>
  );
}
