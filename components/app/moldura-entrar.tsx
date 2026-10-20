import { Card } from "./ui";
import { Logotipo } from "./logotipo";

/** A moldura das páginas sem sessão (entrar, link): fundo claro, logótipo, um cartão. */
export function MolduraEntrar({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-app-page px-4 py-12 text-app-text [color-scheme:light]">
      <div className="mx-auto max-w-sm">
        <Logotipo className="mx-auto mb-6 h-20" />
        <Card className="p-6">{children}</Card>
      </div>
    </div>
  );
}
