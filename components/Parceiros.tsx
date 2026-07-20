import Image from "next/image";
import { Revelar } from "@/components/ui/Revelar";
import { parceiros } from "@/content/site";
import { cn } from "@/lib/utils";

export function Parceiros() {
  return (
    <section className="bg-dl-ink py-16 sm:py-20">
      <div className="container-dl">
        <Revelar>
          <p className="text-dl-steel font-display text-center text-xs font-bold tracking-[0.25em] uppercase">
            Parceiros
          </p>

          <ul className="mt-9 flex flex-wrap items-center justify-center gap-4">
            {parceiros.map((parceiro) => {
              const cartao = cn(
                "flex h-24 w-40 items-center justify-center rounded-lg border p-4 transition-all duration-300 hover:scale-105",
                parceiro.fundo === "escuro"
                  ? "border-white/10 bg-dl-void"
                  : "border-black/5 bg-white hover:shadow-lg hover:shadow-black/25",
              );

              const logo = (
                <span className="relative block h-full w-full">
                  <Image
                    src={parceiro.logo}
                    alt={parceiro.nome}
                    fill
                    sizes="160px"
                    className="object-contain"
                  />
                </span>
              );

              return (
                <li key={parceiro.nome}>
                  {parceiro.url ? (
                    <a
                      href={parceiro.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cartao}
                      aria-label={parceiro.nome}
                    >
                      {logo}
                    </a>
                  ) : (
                    <div className={cartao} aria-label={parceiro.nome}>
                      {logo}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Revelar>
      </div>
    </section>
  );
}
