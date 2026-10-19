"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/components/painel/ui";
import type { LeadMessage, MessageRole } from "@/lib/bot/types";

/**
 * Corpo da conversa estilo WhatsApp. Faz scroll para a mensagem mais recente a
 * cada refresh realtime.
 */
export function ThreadBody({ messages }: { messages: LeadMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div className="flex-1 space-y-2 overflow-y-auto bg-neutral-50 p-3">
      {messages.length === 0 && (
        <p className="py-8 text-center text-xs text-neutral-400">
          Sem mensagens ainda.
        </p>
      )}
      {messages.map((m) => (
        <ChatBubble key={m.id} m={m} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function ChatBubble({ m }: { m: LeadMessage }) {
  const out = m.direction === "out";
  return (
    <div className={cn("flex", out ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          out
            ? m.role === "humano"
              ? "bg-amber-100 text-neutral-900"
              : "bg-red-100 text-neutral-900"
            : "bg-white text-neutral-800",
        )}
      >
        {m.media_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.media_url}
            alt="anexo"
            className="mb-1 max-h-40 rounded-lg"
          />
        )}
        <p className="whitespace-pre-wrap">{m.body}</p>
        <div className="mt-1 flex items-center justify-end gap-2 text-[10px] text-neutral-400">
          <span className="capitalize">{roleLabel(m.role)}</span>
          {out && m.estado && (
            <span className={cn("rounded px-1", m.estado === "falhou" || m.estado === "desconhecido" ? "bg-red-100 text-red-700" : m.estado === "na_fila" ? "bg-neutral-200 text-neutral-600" : "text-neutral-400")}>
              {ESTADO_LABEL[m.estado] ?? m.estado}
            </span>
          )}
          <span>{timeAgo(m.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

const ESTADO_LABEL: Record<string, string> = {
  na_fila: "na fila",
  enviada: "enviada",
  entregue: "entregue",
  lida: "lida",
  falhou: "falhou",
  desconhecido: "desconhecido",
  cancelada: "cancelada",
};

function roleLabel(role: MessageRole): string {
  return { lead: "cliente", bot: "assistente", humano: "Daniel" }[role];
}
