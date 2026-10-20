import { Button, Card } from "@/components/painel/ui";
import { Logotipo } from "@/components/app/logotipo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ erro?: string }>;
}) {
  const { erro } = (await searchParams) ?? {};

  return (
    <div className="mx-auto max-w-sm py-12">
      <Logotipo className="mx-auto mb-6 h-20" />
      <Card className="p-6">
        <h1 className="text-lg font-semibold text-neutral-900">
          Painel de Inscrições
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Introduz a password para entrar.
        </p>
        <form method="post" action="/api/painel/login" className="mt-4 space-y-3">
          <input
            type="password"
            name="password"
            autoFocus
            placeholder="Password"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          {erro === "limite" ? (
            <p className="text-sm text-red-600">Demasiadas tentativas. Tenta daqui a 15 minutos.</p>
          ) : erro ? (
            <p className="text-sm text-red-600">Password incorreta.</p>
          ) : null}
          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  );
}
