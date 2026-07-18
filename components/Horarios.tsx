"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { locais, whatsappUrl, type Aula } from "@/content/site";
import { cn } from "@/lib/utils";

const etiquetas: Record<Aula["tipo"], { label: string; classe: string }> = {
  kids: { label: "Kids", classe: "bg-dl-red/15 text-dl-red" },
  "jiu-jitsu": { label: "Jiu-Jitsu", classe: "bg-dl-bone/10 text-dl-bone" },
  mma: { label: "MMA", classe: "bg-dl-red/15 text-dl-red" },
  misto: { label: "Misto", classe: "bg-dl-bone/10 text-dl-bone" },
};

export function Horarios() {
  const [ativo, setAtivo] = useState(locais[0].id);
  const local = locais.find((l) => l.id === ativo) ?? locais[0];

  return (
    <section id="horarios" className="bg-dl-black relative py-24 sm:py-32">
      <div className="container-dl">
        <div className="max-w-2xl">
          <p className="eyebrow">Horários</p>
          <h2 className="h-display text-dl-bone mt-4 text-5xl sm:text-6xl">
            Quando treinamos
          </h2>
          <p className="text-dl-ash mt-5 text-base leading-relaxed sm:text-lg">
            Dois espaços, horários pensados para quem estuda e para quem trabalha.
            Escolha o local mais perto de si.
          </p>
        </div>

        {/* Separadores de local */}
        <div
          role="tablist"
          aria-label="Escolher local"
          className="border-dl-coal mt-10 flex gap-1 border-b"
        >
          {locais.map((l) => {
            const selecionado = l.id === ativo;
            return (
              <button
                key={l.id}
                role="tab"
                type="button"
                aria-selected={selecionado}
                aria-controls={`painel-${l.id}`}
                id={`separador-${l.id}`}
                onClick={() => setAtivo(l.id)}
                className={cn(
                  "font-display relative px-6 py-3.5 text-lg font-bold tracking-[0.08em] uppercase transition-colors",
                  selecionado
                    ? "text-dl-bone"
                    : "text-dl-steel hover:text-dl-ash",
                )}
              >
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {l.nome}
                </span>
                {selecionado && (
                  <motion.span
                    layoutId="separador-ativo"
                    className="bg-dl-red absolute inset-x-0 -bottom-px h-0.5"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Painel */}
        <div
          role="tabpanel"
          id={`painel-${local.id}`}
          aria-labelledby={`separador-${local.id}`}
          className="mt-8"
        >
          {/* Morada */}
          {local.morada ? (
            <p className="text-dl-ash mb-6 flex items-center gap-2 text-sm">
              <MapPin className="text-dl-red h-4 w-4 shrink-0" />
              {local.morada}
            </p>
          ) : (
            <p className="border-dl-red/40 bg-dl-red/5 text-dl-ash mb-6 border-l-2 py-2 pl-4 text-sm">
              <strong className="text-dl-bone">Falta a morada de {local.nome}.</strong>{" "}
              Preencher em <code className="text-dl-bone text-xs">content/site.ts</code>{" "}
              (<code className="text-xs">locais</code>).
            </p>
          )}

          {/* Tabela — desktop */}
          <div className="border-dl-coal hidden overflow-hidden rounded-sm border md:block">
            <table className="w-full text-left">
              <thead className="bg-dl-ink">
                <tr>
                  {["Turma", "Dias", "Horário", ""].map((h, i) => (
                    <th
                      key={i}
                      scope="col"
                      className="text-dl-steel font-display px-6 py-4 text-xs font-bold tracking-[0.15em] uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {local.aulas.map((aula, i) => {
                  const etiqueta = etiquetas[aula.tipo];
                  return (
                    <tr
                      key={`${aula.turma}-${aula.horario}-${i}`}
                      className="border-dl-coal hover:bg-dl-ink/60 border-t transition-colors"
                    >
                      <td className="text-dl-bone px-6 py-5 font-semibold">
                        {aula.turma}
                      </td>
                      <td className="text-dl-ash px-6 py-5 text-sm">{aula.dias}</td>
                      <td className="text-dl-bone px-6 py-5">
                        <span className="inline-flex items-center gap-2 font-medium tabular-nums">
                          <Clock className="text-dl-red h-4 w-4" />
                          {aula.horario}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={cn(
                            "font-display inline-block rounded-sm px-2.5 py-1 text-xs font-bold tracking-[0.1em] uppercase",
                            etiqueta.classe,
                          )}
                        >
                          {etiqueta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cartões — mobile */}
          <ul className="space-y-3 md:hidden">
            {local.aulas.map((aula, i) => {
              const etiqueta = etiquetas[aula.tipo];
              return (
                <li
                  key={`${aula.turma}-${aula.horario}-${i}`}
                  className="border-dl-coal bg-dl-ink rounded-sm border p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-dl-bone font-semibold">{aula.turma}</h3>
                    <span
                      className={cn(
                        "font-display shrink-0 rounded-sm px-2.5 py-1 text-xs font-bold tracking-[0.1em] uppercase",
                        etiqueta.classe,
                      )}
                    >
                      {etiqueta.label}
                    </span>
                  </div>
                  <p className="text-dl-ash mt-2 text-sm">{aula.dias}</p>
                  <p className="text-dl-bone mt-1 inline-flex items-center gap-2 text-sm font-medium tabular-nums">
                    <Clock className="text-dl-red h-4 w-4" />
                    {aula.horario}
                  </p>
                </li>
              );
            })}
          </ul>

          {/* CTA */}
          <div className="border-dl-coal mt-8 flex flex-col items-start gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-dl-ash text-sm">
              Não encontra um horário que lhe sirva?{" "}
              <span className="text-dl-bone">Fale connosco</span> — arranjamos
              solução.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group text-dl-red font-display inline-flex items-center gap-2 text-sm font-bold tracking-[0.1em] uppercase transition-colors hover:text-white"
            >
              Marcar aula grátis
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
