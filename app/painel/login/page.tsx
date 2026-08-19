import { loginAction } from "@/app/painel/actions";
import { Button, Card } from "@/components/painel/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ erro?: string }>;
}) {
  const { erro } = (await searchParams) ?? {};

  return (
    <div className="mx-auto max-w-sm py-12">
      <Card className="p-6">
        <h1 className="text-lg font-semibold text-neutral-900">
          Painel de Inscrições
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Introduz a password para entrar.
        </p>
        <form action={loginAction} className="mt-4 space-y-3">
          <input
            type="password"
            name="password"
            autoFocus
            placeholder="Password"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          {erro && (
            <p className="text-sm text-red-600">Password incorreta.</p>
          )}
          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  );
}
