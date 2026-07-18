import Image from "next/image";
import { Revelar } from "@/components/ui/Revelar";
import { parceiros } from "@/content/site";

export function Parceiros() {
  return (
    <section className="bg-dl-ink py-16 sm:py-20">
      <div className="container-dl">
        <Revelar>
          <p className="text-dl-steel font-display text-center text-xs font-bold tracking-[0.25em] uppercase">
            Parceiros
          </p>

          <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-20">
            {parceiros.map((parceiro) => (
              <li key={parceiro.nome}>
                <a
                  href={parceiro.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block opacity-45 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
                  aria-label={parceiro.nome}
                >
                  <Image
                    src={parceiro.logo}
                    alt={parceiro.nome}
                    width={140}
                    height={70}
                    className="h-14 w-auto object-contain sm:h-16"
                  />
                </a>
              </li>
            ))}
          </ul>
        </Revelar>
      </div>
    </section>
  );
}
