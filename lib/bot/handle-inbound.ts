import "server-only";
import type { InboundMessage, OutboundOption } from "@/lib/messaging/provider";
import type { Lead, Modalidade, Publico, Step } from "./types";
import {
  botEnabled,
  getOrCreateLead,
  pauseForHuman,
  setStep,
  updateLead,
} from "./state";
import { logInbound, sendOutbound } from "./outbound";
import { interpret } from "./nlu";
import { aulasPara } from "./schedule";
import {
  confirmOptions,
  confirmedText,
  localOptions,
  modalidadeOptions,
  origemOptions,
  promptFor,
  publicoOptions,
} from "./flow";

/**
 * Ponto de entrada único para cada mensagem recebida (webhook real ou
 * simulador). Idempotente, respeita a pausa para humano e o interruptor global,
 * e depois faz avançar a máquina de estados do onboarding.
 */
export async function handleInbound(msg: InboundMessage): Promise<void> {
  const lead = await getOrCreateLead(msg.from, msg.name);

  // Idempotência: regista o inbound; se for reentrega (mesmo wa_message_id), sai.
  const created = await logInbound({
    leadId: lead.id,
    phone: msg.from,
    role: "lead",
    body: msg.text || (msg.buttonId ? `[${msg.buttonId}]` : "(sem texto)"),
    mediaUrl: msg.mediaUrl,
    waMessageId: msg.waMessageId,
  });
  if (!created) return;

  // Lead assumida por um humano, ou bot desligado → fica calado.
  if (lead.paused || lead.status === "humano") return;
  if (!(await botEnabled())) return;

  try {
    await advance(lead, msg);
  } catch (err) {
    console.error("[engine] advance failed", err);
  }
}

// ─────────────────────────── Máquina de estados ───────────────────────────

async function advance(lead: Lead, msg: InboundMessage): Promise<void> {
  switch (lead.step) {
    case "inicio":
      await sendStep(lead, "nome");
      return;

    case "nome": {
      const text = (msg.text || "").trim();
      if (!text) return reAsk(lead);
      // Se for claramente uma pergunta, responde e volta a pedir o nome.
      if (text.endsWith("?")) {
        await answerFreeText(lead, msg);
        return reAsk(lead);
      }
      const fresh = await updateLead(lead.id, {
        name: cleanName(text),
        status: "em_progresso",
      });
      return sendStep(fresh, "publico");
    }

    case "publico": {
      const pick = await resolvePick(lead, msg, publicoOptions());
      if (!pick) return;
      const publico: Publico = pick === "pub:kids" ? "kids" : "adulto";
      if (publico === "kids") {
        // Kids = sempre jiu-jitsu infantil → salta a pergunta da modalidade.
        const fresh = await updateLead(lead.id, {
          publico,
          modalidade: "jiu-jitsu",
        });
        return goToLocalOrHorario(fresh);
      }
      const fresh = await updateLead(lead.id, { publico });
      return sendStep(fresh, "modalidade");
    }

    case "modalidade": {
      const pick = await resolvePick(lead, msg, modalidadeOptions());
      if (!pick) return;
      const modalidade = pick.slice("mod:".length) as Modalidade;
      const fresh = await updateLead(lead.id, { modalidade });
      return goToLocalOrHorario(fresh);
    }

    case "local": {
      const opts =
        lead.publico && lead.modalidade
          ? localOptions(lead.publico, lead.modalidade)
          : [];
      const pick = await resolvePick(lead, msg, opts);
      if (!pick) return;
      const fresh = await updateLead(lead.id, {
        local_slug: pick.slice("loc:".length),
      });
      return sendStep(fresh, "horario");
    }

    case "horario": {
      if (!lead.publico || !lead.modalidade || !lead.local_slug) {
        return goToLocalOrHorario(lead);
      }
      const opts = horarioOpts(lead);
      const pick = await resolvePick(lead, msg, opts);
      if (!pick) return;
      const idx = Number(pick.slice("hor:".length));
      const aula = aulasPara(lead.publico, lead.modalidade, lead.local_slug)[idx];
      if (!aula) return reAsk(lead);
      const fresh = await updateLead(lead.id, {
        turma: aula.turma,
        dias: aula.dias,
        horario: aula.horario,
      });
      return sendStep(fresh, "origem");
    }

    case "origem": {
      const pick = await resolvePick(lead, msg, origemOptions());
      if (!pick) return;
      const fresh = await updateLead(lead.id, {
        origem: pick.slice("org:".length),
      });
      return sendStep(fresh, "confirmacao");
    }

    case "confirmacao": {
      const pick = await resolvePick(lead, msg, confirmOptions());
      if (!pick) return;
      if (pick === "cfm:sim") {
        await updateLead(lead.id, { status: "concluido", step: "concluido" });
        return say(lead, confirmedText(lead.name));
      }
      // Corrigir → recomeça em "para quem", mantendo o nome.
      const fresh = await updateLead(lead.id, {
        modalidade: null,
        local_slug: null,
        turma: null,
        dias: null,
        horario: null,
        origem: null,
      });
      await say(fresh, "Sem problema — vamos rever. 🙂");
      return sendStep(fresh, "publico");
    }

    case "concluido":
    default:
      // Já concluído (ou estado desconhecido) → responde a dúvidas, não reinicia.
      return answerFreeText(lead, msg);
  }
}

// ─────────────────────────────── Auxiliares ───────────────────────────────

function horarioOpts(lead: Lead): OutboundOption[] {
  const p = promptFor({ ...lead, step: "horario" });
  return p.options;
}

/** Envia a pergunta do próximo passo e fixa o estado. */
async function sendStep(lead: Lead, step: Step): Promise<void> {
  await setStep(lead.id, step);
  const p = promptFor({ ...lead, step });
  await say(lead, p.text, p.options, p.listLabel);
}

/** Repete a pergunta do passo atual (sem mudar de estado). */
async function reAsk(lead: Lead): Promise<void> {
  const p = promptFor(lead);
  await say(lead, p.text, p.options, p.listLabel);
}

async function say(
  lead: Lead,
  text: string,
  options: OutboundOption[] = [],
  listLabel?: string,
): Promise<void> {
  await sendOutbound({
    leadId: lead.id,
    to: lead.phone,
    role: "bot",
    body: text,
    options: options.length ? options : undefined,
    listLabel,
  });
}

/**
 * Resolve a resposta a um passo com opções. Devolve o id escolhido, ou null
 * quando já tratou o caso (respondeu a uma pergunta, repetiu a pergunta, ou
 * escalou para humano).
 */
async function resolvePick(
  lead: Lead,
  msg: InboundMessage,
  options: OutboundOption[],
): Promise<string | null> {
  // Resposta determinística: botão/lista premido.
  if (msg.buttonId && options.some((o) => o.id === msg.buttonId)) {
    return msg.buttonId;
  }

  const text = (msg.text || "").trim();
  if (!text) {
    await reAsk(lead);
    return null;
  }

  // Texto livre → o LLM interpreta.
  const res = await interpret(lead, text, options);

  if (res.needs_human) {
    await pauseForHuman(lead.id, res.human_reason ?? "pedido do utilizador");
    await say(
      lead,
      "Deixa-me passar isto ao Daniel — ele fala contigo diretamente por aqui. 🙏",
    );
    return null;
  }

  if (res.intent === "pergunta" && res.answer) {
    await say(lead, res.answer);
    await reAsk(lead);
    return null;
  }

  if (
    res.intent === "resposta" &&
    res.match_id &&
    options.some((o) => o.id === res.match_id) &&
    res.confidence >= 0.6
  ) {
    return res.match_id;
  }

  await say(lead, "Desculpa, não percebi bem. 🙂 Podes escolher uma das opções?");
  await reAsk(lead);
  return null;
}

/** Modalidade compatível dá 0, 1 ou vários locais — salta o passo se só houver 1. */
async function goToLocalOrHorario(lead: Lead): Promise<void> {
  if (!lead.publico || !lead.modalidade) return sendStep(lead, "modalidade");
  const opts = localOptions(lead.publico, lead.modalidade);

  if (opts.length === 0) {
    await pauseForHuman(lead.id, "sem aula compatível com a escolha");
    return say(
      lead,
      "Para esse pedido, o melhor é falares diretamente com o Daniel. Já lhe passo a tua mensagem. 🙏",
    );
  }

  if (opts.length === 1) {
    const fresh = await updateLead(lead.id, {
      local_slug: opts[0].id.slice("loc:".length),
    });
    return sendStep(fresh, "horario");
  }

  return sendStep(lead, "local");
}

/** Responde a uma pergunta em texto livre (fundamentado no site), sem avançar. */
async function answerFreeText(lead: Lead, msg: InboundMessage): Promise<void> {
  const text = (msg.text || "").trim();
  if (!text) return;
  const res = await interpret(lead, text, []);
  if (res.needs_human) {
    await pauseForHuman(lead.id, res.human_reason ?? "questão para humano");
    return say(
      lead,
      "Deixa-me passar isto ao Daniel — ele fala contigo diretamente por aqui. 🙏",
    );
  }
  await say(
    lead,
    res.answer ?? "Obrigado pela mensagem! O Daniel fala contigo em breve. 🥋",
  );
}

function cleanName(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 80);
}
