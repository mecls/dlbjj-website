import type { Db } from "../db";
import { log, redigirTelefone } from "../log";

/**
 * Passagem de mão automática (spec §3 G, §6.5). O gateway publica `message.sent`
 * para TODA a mensagem que sai do número, e o payload não diz quem a escreveu:
 * o worker pela API ou o Daniel no telemóvel. O discriminador é construído com
 * a única coisa que só nós sabemos — os ids dos envios NOSSOS.
 *
 *   id conhecido   → eco nosso: ignorar.
 *   id desconhecido → o Daniel escreveu: pausar a conversa, calar o bot.
 *
 * Duas memórias, por dois motivos: o Set em memória fecha a corrida (o eco
 * pode chegar antes de a BD ter a linha fechada), e a BD sobrevive a um
 * reinício (o Set não). Ambas são precisas.
 */
const MAX_IDADE_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRADAS = 20_000;
const nossos = new Map<string, number>();

/** CHAMAR SINCRONAMENTE, logo a seguir ao envio resolver, antes de qualquer await. */
export function rememberOurSend(id: string): void {
  const agora = Date.now();
  nossos.set(id, agora);
  if (nossos.size > MAX_ENTRADAS) {
    const limite = agora - MAX_IDADE_MS;
    for (const [k, t] of nossos) if (t < limite) nossos.delete(k);
    while (nossos.size > MAX_ENTRADAS) {
      const primeiro = nossos.keys().next();
      if (primeiro.done) break;
      nossos.delete(primeiro.value);
    }
  }
}

export function isRecentlyOurs(id: string): boolean {
  const t = nossos.get(id);
  if (t === undefined) return false;
  if (Date.now() - t > MAX_IDADE_MS) {
    nossos.delete(id);
    return false;
  }
  return true;
}

export function clearRegistry(): void {
  nossos.clear();
}

export function registrySize(): number {
  return nossos.size;
}

async function estaNaBd(db: Db, id: string): Promise<boolean> {
  const [m, f] = await Promise.all([
    db.from("dlbjj_mensagens").select("id").eq("wa_message_id", id).limit(1).maybeSingle(),
    db.from("dlbjj_fila_saida").select("id").eq("wa_message_id", id).limit(1).maybeSingle(),
  ]);
  return Boolean(m.data || f.data);
}

/**
 * O eco pode chegar ANTES de o nosso `sendText` responder — nessa janela o id
 * ainda não está no registo nem na BD. Mas o drainer marca `envio_iniciado_em`
 * antes de enviar: uma linha `a_enviar` com envio iniciado, para este número e
 * com este texto, é um envio nosso a meio. Sem isto era uma passagem de mão
 * falsa: o bot calava-se 24 h por causa da sua própria resposta.
 */
async function envioNossoEmCurso(db: Db, phone: string, texto: string): Promise<boolean> {
  const { data } = await db
    .from("dlbjj_fila_saida")
    .select("id")
    .eq("phone", phone)
    .eq("estado", "a_enviar")
    .not("envio_iniciado_em", "is", null)
    .eq("corpo", texto)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

export interface Eco {
  id: string;
  phone: string | null;
  chatId: string;
  text: string;
}

export type ResultadoHandoff = "ignorado" | "pausado" | "sem_telefone";

export async function applyHandoff(db: Db, eco: Eco, pausaHoras: number): Promise<ResultadoHandoff> {
  if (isRecentlyOurs(eco.id)) return "ignorado";
  if (await estaNaBd(db, eco.id)) return "ignorado";
  if (eco.phone && (await envioNossoEmCurso(db, eco.phone, eco.text))) {
    log.debug("eco de um envio nosso ainda em curso", { phone: redigirTelefone(eco.phone) });
    return "ignorado";
  }
  if (!eco.phone) {
    log.warn("eco do Daniel num chat sem número (@lid); nada a pausar", { chatId: redigirTelefone(eco.chatId) });
    return "sem_telefone";
  }

  const ate = new Date(Date.now() + pausaHoras * 60 * 60 * 1000).toISOString();
  const patch = { paused: true, status: "humano", human_reason: "Daniel respondeu pelo telemóvel", humano_ate: ate };

  const { data: lead } = await db.from("dlbjj_leads").select("id").eq("phone", eco.phone).maybeSingle();
  let leadId: string | null = lead?.id ?? null;
  if (leadId) {
    await db.from("dlbjj_leads").update(patch).eq("id", leadId);
  } else {
    const { data: nova } = await db
      .from("dlbjj_leads")
      .insert({ phone: eco.phone, step: "inicio", ...patch })
      .select("id")
      .single();
    leadId = nova?.id ?? null;
  }

  const { error } = await db.from("dlbjj_mensagens").insert({
    lead_id: leadId,
    phone: eco.phone,
    direction: "out",
    role: "humano",
    body: eco.text,
    wa_message_id: eco.id,
    estado: "enviada",
  });
  if (error && error.code !== "23505") log.error("mensagem do Daniel não registada", { error });

  log.info("passagem de mão: o Daniel respondeu pelo telemóvel", { phone: redigirTelefone(eco.phone), ate });
  return "pausado";
}
