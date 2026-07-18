import {
  Brain,
  Dumbbell,
  HeartPulse,
  ShieldCheck,
  TrendingUp,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { Revelar } from "@/components/ui/Revelar";
import { beneficios } from "@/content/site";

/** Mapa dos nomes usados em content/site.ts para os ícones reais. */
const icones: Record<string, LucideIcon> = {
  ShieldCheck,
  Brain,
  Dumbbell,
  HeartPulse,
  Wind,
  TrendingUp,
  Users,
};

export function Beneficios() {
  return (
    <section className="bg-dl-ink relative py-24 sm:py-32">
      <div className="container-dl">
        <Revelar className="max-w-2xl">
          <p className="eyebrow">Benefícios</p>
          <h2 className="h-display text-dl-bone mt-4 text-5xl sm:text-6xl">
            O que ganha em cada treino
          </h2>
          <p className="text-dl-ash mt-5 text-base leading-relaxed sm:text-lg">
            O Jiu-Jitsu muda o corpo — mas é fora do tatame que se nota mais.
          </p>
        </Revelar>

        <ul className="mt-14 grid gap-px overflow-hidden rounded-sm sm:grid-cols-2 lg:grid-cols-4">
          {beneficios.map((beneficio, i) => {
            const Icone = icones[beneficio.icone] ?? ShieldCheck;
            return (
              <Revelar key={beneficio.titulo} atraso={i * 0.06} className="h-full">
                <li className="group bg-dl-black outline-dl-coal hover:bg-dl-coal/40 h-full p-7 outline transition-colors">
                  <span className="bg-dl-red/10 text-dl-red group-hover:bg-dl-red inline-flex h-12 w-12 items-center justify-center rounded-sm transition-colors group-hover:text-white">
                    <Icone className="h-6 w-6" />
                  </span>
                  <h3 className="h-display text-dl-bone mt-5 text-xl">
                    {beneficio.titulo}
                  </h3>
                  <p className="text-dl-ash mt-2 text-sm leading-relaxed">
                    {beneficio.descricao}
                  </p>
                </li>
              </Revelar>
            );
          })}

          {/* Cartão final — CTA que preenche a grelha de 8 */}
          <Revelar atraso={beneficios.length * 0.06} className="h-full">
            <li className="bg-dl-red outline-dl-red flex h-full flex-col justify-center p-7 outline">
              <p className="h-display text-2xl leading-tight text-white">
                E a primeira aula
                <br />é grátis.
              </p>
              <p className="mt-2 text-sm text-white/80">
                Traga roupa confortável. O resto é connosco.
              </p>
            </li>
          </Revelar>
        </ul>
      </div>
    </section>
  );
}
