import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import { IconeFacebook, IconeInstagram } from "@/components/ui/IconesMarcas";
import { contactos, locais, marca, navegacao, programas } from "@/content/site";

export function Footer() {
  const ano = new Date().getFullYear();

  return (
    <footer className="bg-dl-void border-dl-coal border-t">
      {/* Faixa vermelha no topo do rodapé */}
      <div aria-hidden className="bg-dl-red h-1 w-full" />

      <div className="container-dl py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Marca */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/logo.png"
                alt=""
                width={52}
                height={52}
                className="h-13 w-13 object-contain"
              />
              <div>
                <p className="h-display text-dl-bone text-lg leading-none">
                  Academia <span className="text-dl-red">DL</span>-BJJ
                </p>
                <p className="text-dl-steel mt-1 text-[0.6875rem] font-medium tracking-[0.18em] uppercase">
                  Brazilian Jiu-Jitsu
                </p>
              </div>
            </div>

            <p className="text-dl-ash mt-5 text-sm leading-relaxed italic">
              &ldquo;{marca.lema}&rdquo;
            </p>

            <p className="font-display text-dl-red mt-5 text-sm font-bold tracking-[0.15em] uppercase">
              {marca.valores.join(" · ")}
            </p>

            {/* Redes sociais */}
            <div className="mt-6 flex gap-2.5">
              <a
                href={contactos.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="border-dl-coal text-dl-ash hover:border-dl-red hover:bg-dl-red inline-flex h-10 w-10 items-center justify-center rounded-sm border transition-colors hover:text-white"
                aria-label={`Instagram — ${contactos.instagramHandle}`}
              >
                <IconeInstagram className="h-4.5 w-4.5" />
              </a>
              <a
                href={contactos.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="border-dl-coal text-dl-ash hover:border-dl-red hover:bg-dl-red inline-flex h-10 w-10 items-center justify-center rounded-sm border transition-colors hover:text-white"
                aria-label="Facebook"
              >
                <IconeFacebook className="h-4.5 w-4.5" />
              </a>
            </div>
          </div>

          {/* Navegação */}
          <nav aria-label="Navegação do rodapé">
            <h2 className="font-display text-dl-bone text-sm font-bold tracking-[0.18em] uppercase">
              Academia
            </h2>
            <ul className="mt-5 space-y-3">
              {navegacao.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-dl-ash hover:text-dl-red text-sm transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Programas */}
          <div>
            <h2 className="font-display text-dl-bone text-sm font-bold tracking-[0.18em] uppercase">
              Programas
            </h2>
            <ul className="mt-5 space-y-3">
              {programas.map((programa) => (
                <li key={programa.id}>
                  <a
                    href="#programas"
                    className="text-dl-ash hover:text-dl-red text-sm transition-colors"
                  >
                    {programa.nome}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#programas"
                  className="text-dl-ash hover:text-dl-red text-sm transition-colors"
                >
                  Aulas Privadas
                </a>
              </li>
            </ul>
          </div>

          {/* Contactos */}
          <div>
            <h2 className="font-display text-dl-bone text-sm font-bold tracking-[0.18em] uppercase">
              Contactos
            </h2>
            <ul className="mt-5 space-y-3.5">
              <li>
                <a
                  href={`tel:${contactos.telefoneDigitos}`}
                  className="text-dl-ash hover:text-dl-red group flex items-center gap-2.5 text-sm transition-colors"
                >
                  <Phone className="text-dl-red h-4 w-4 shrink-0" />
                  {contactos.telefone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contactos.email}`}
                  className="text-dl-ash hover:text-dl-red flex items-center gap-2.5 text-sm break-all transition-colors"
                >
                  <Mail className="text-dl-red h-4 w-4 shrink-0" />
                  {contactos.email}
                </a>
              </li>
              {locais.map((local) => (
                <li
                  key={local.id}
                  className="text-dl-ash flex items-start gap-2.5 text-sm"
                >
                  <MapPin className="text-dl-red mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <span className="text-dl-bone">{local.nome}</span>
                    {local.morada && (
                      <span className="text-dl-steel block text-xs">
                        {local.morada}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="border-dl-coal mt-14 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
          <p className="text-dl-steel text-xs">
            © {marca.fundadaEm}–{ano} {marca.nomeCompleto}. Todos os direitos
            reservados.
          </p>
          <p className="text-dl-steel text-xs">
            Formamos campeões no tatame e na vida.
          </p>
        </div>
      </div>
    </footer>
  );
}
