"use client";

import { useTransition } from "react";
import { Button } from "@/components/painel/ui";
import {
  pauseLead,
  resumeLead,
  setLeadStatus,
} from "@/app/painel/actions";

/** Botões de controlo da lead: pausar/retomar o bot e marcar estado. */
export function LeadActions({
  phone,
  paused,
}: {
  phone: string;
  paused: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {paused ? (
        <Button
          variant="default"
          disabled={pending}
          onClick={() => start(() => resumeLead(phone))}
        >
          Retomar bot
        </Button>
      ) : (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => start(() => pauseLead(phone))}
        >
          Pausar bot (assumir)
        </Button>
      )}
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => start(() => setLeadStatus(phone, "concluido"))}
      >
        Marcar concluído
      </Button>
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => start(() => setLeadStatus(phone, "descartado"))}
      >
        Descartar
      </Button>
    </div>
  );
}
