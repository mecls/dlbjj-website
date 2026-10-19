"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/painel/ui";
import { operatorReply } from "@/app/painel/actions";

/** Resposta do operador (Daniel) numa conversa. Ao enviar, assume a conversa. */
export function ReplyBox({ phone }: { phone: string }) {
  const [text, setText] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send() {
    const body = text.trim();
    if (!body) return;
    setText("");
    setErro(null);
    start(async () => {
      try {
        await operatorReply(phone, body);
      } catch (e) {
        setErro(`Não foi possível enviar: ${e instanceof Error ? e.message : "erro"}`);
        setText(body);
      }
    });
  }

  return (
    <div className="border-t border-neutral-100 p-3">
      {erro && <p className="mb-2 text-xs text-red-700">{erro}</p>}
    <div className="flex items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        placeholder="Responder como Daniel (pausa o bot)…"
        className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      <Button onClick={send} disabled={pending}>
        Enviar
      </Button>
    </div>
    </div>
  );
}
