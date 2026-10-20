import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { serviceClient } from "@/lib/supabase/service";
import { Card } from "@/components/painel/ui";
import { ThreadBody } from "@/components/painel/thread-body";
import { ReplyBox } from "@/components/painel/reply-box";
import { RailConversa } from "@/components/painel/rail-conversa";
import { DetalhesSheet } from "@/components/painel/detalhes-sheet";
import type { Lead, LeadMessage } from "@/lib/bot/types";
import { lerResumo } from "@/lib/painel/resumo";

export const dynamic = "force-dynamic";

/** A conversa ao centro, a pessoa à direita (ajustes §2.2); abaixo de xl a pessoa vive na folha «Detalhes». */
export default async function LeadPage({ params, searchParams }: { params: Promise<{ phone: string }>; searchParams?: Promise<{ ok?: string; erro?: string }> }) {
  await requireAuth();
  const { phone } = await params;
  const { erro } = (await searchParams) ?? {};
  const db = serviceClient();

  const [{ data: leadRow }, { data: msgs }] = await Promise.all([
    db.from("dlbjj_leads").select("*").eq("phone", phone).maybeSingle(),
    db.from("dlbjj_mensagens").select("*").eq("phone", phone).order("created_at", { ascending: true }),
  ]);

  const lead = leadRow as Lead | null;
  const messages = (msgs ?? []) as LeadMessage[];

  if (!lead) {
    return (
      <div className="space-y-4">
        <Link href="/painel/mensagens" className="text-sm text-app-muted hover:underline">
          ← Mensagens
        </Link>
        <Card className="p-8 text-center text-sm text-app-muted">Lead não encontrada ({phone}).</Card>
      </div>
    );
  }

  const ultima = messages.at(-1)?.created_at ?? null;
  const { resumo, desatualizado } = await lerResumo(lead.id, ultima);
  const rail = <RailConversa lead={lead} totalMensagens={messages.length} resumo={resumo} desatualizado={desatualizado} erro={erro} />;

  return (
    <div className="space-y-4">
      <Link href="/painel/mensagens" className="text-sm text-app-muted hover:underline">
        ← Mensagens
      </Link>

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_440px] xl:gap-6">
        <Card className="flex min-h-[calc(100vh-72px-5rem)] flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-app-border px-4 py-2 text-sm">
            <div className="min-w-0 truncate">
              <span className="font-semibold">{lead.name || "Sem nome"}</span>
              <span className="text-app-muted"> · {lead.phone}</span>
              {lead.paused && <span className="ml-2 text-xs text-amber-700">(bot em pausa — respostas manuais)</span>}
            </div>
            <DetalhesSheet>{rail}</DetalhesSheet>
          </div>
          <ThreadBody messages={messages} />
          <ReplyBox phone={lead.phone} />
        </Card>

        <Card className="mt-4 hidden h-fit xl:mt-0 xl:block">{rail}</Card>
      </div>
    </div>
  );
}
