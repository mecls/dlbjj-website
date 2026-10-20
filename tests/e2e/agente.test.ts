import { beforeAll, describe, expect, it } from "vitest";
import { db, resetDb } from "../helpers/db";
import { E2E_URL, filaDe, inject } from "../helpers/app";
import { cookiePainel, getPainel, postPainel } from "../helpers/painel";

const sb = db();

beforeAll(() => {
  resetDb();
});

describe("Painel — agente", () => {
  it("sem heartbeat diz que o worker ainda não reportou", async () => {
    const r = await getPainel("/painel/agente");
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain("O worker ainda não reportou");
    expect(html).toContain("Ligado");
    expect(html).toContain("Proativas hoje: 0 de 10");
  });

  it("desligar o bot: nada sai, mas a mensagem recebida fica registada (AC-10, metade da app)", async () => {
    const r = await postPainel("/api/painel/agente/interruptor", { estado: "off" });
    expect(r.status).toBe(303);
    const { data: s } = await sb.from("dlbjj_settings").select("value").eq("key", "bot_enabled").single();
    expect(s!.value).toBe("off");
    const phone = "351900000601";
    await inject({ from: phone, text: "Olá" });
    const { data: lead } = await sb.from("dlbjj_leads").select("id").eq("phone", phone).single();
    expect(lead).not.toBeNull();
    const { data: msgs } = await sb.from("dlbjj_mensagens").select("direction").eq("phone", phone);
    expect(msgs).toEqual([{ direction: "in" }]);
    expect(await filaDe(sb, phone)).toEqual([]);
    const html = await (await getPainel("/painel/agente")).text();
    expect(html).toContain("Desligado");
    await postPainel("/api/painel/agente/interruptor", { estado: "on" });
  });

  it("mostra a sessão ligada, caída, os envios desconhecidos e as entradas por processar", async () => {
    await sb.from("dlbjj_sessao").upsert({ id: 1, estado: "ligado", telefone: "351925797266", visto_em: new Date().toISOString(), enviadas_hoje: 3, recebidas_hoje: 5 });
    let html = await (await getPainel("/painel/agente")).text();
    expect(html).toContain("Sessão ligada");
    expect(html).toContain("351925797266");
    expect(html).toContain("visto há");

    await sb.from("dlbjj_sessao").update({ estado: "caido", detalhe: "disconnected: logged out" }).eq("id", 1);
    await sb.from("dlbjj_fila_saida").insert({ phone: "351900000602", kind: "resposta", corpo: "x", estado: "desconhecido", erro: "expirou sem resposta" });
    await sb.from("dlbjj_entradas_falhadas").insert({ delivery_id: "wamid.falhou", payload: { from: "351900000603", text: "oi" }, tentativas: 4, erro: "app respondeu 503" });
    html = await (await getPainel("/painel/agente")).text();
    expect(html).toContain("Sessão WhatsApp em baixo");
    expect(html).toContain("logged out");
    expect(html).toContain("Envios desconhecidos");
    expect(html).toContain("expirou sem resposta");
    expect(html).toContain("Mensagens recebidas por processar");
    expect(html).toContain("app respondeu 503");
  });
});

describe("Login", () => {
  async function tentar(password: string, ip: string) {
    return fetch(`${E2E_URL}/api/painel/login`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": ip },
      body: new URLSearchParams({ password }).toString(),
      redirect: "manual",
    });
  }

  it("password errada → volta ao login com erro; certa → cookie e /painel", async () => {
    const r = await tentar("errada", "9.9.9.1");
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toContain("/painel/login?erro=1");
    const ok = await tentar(process.env.DASHBOARD_PASSWORD!, "9.9.9.1");
    expect(ok.status).toBe(303);
    expect(ok.headers.get("location")).toMatch(/\/painel$/);
    expect(ok.headers.get("set-cookie")).toContain(cookiePainel().split("=")[0]);
  });

  it("à 6.ª tentativa em 15 min trava, com a mensagem na página", async () => {
    for (let i = 0; i < 5; i++) await tentar("errada", "9.9.9.2");
    const r = await tentar("errada", "9.9.9.2");
    expect(r.headers.get("location")).toContain("erro=limite");
    const html = await (await fetch(`${E2E_URL}/painel/login?erro=limite`)).text();
    expect(html).toContain("Demasiadas tentativas. Tenta daqui a 15 minutos.");
  });
});

describe("Painel — agente: batimento parado", () => {
  it("uma sessão 'ligado' sem sinal há 20 minutos aparece como sem sinal", async () => {
    await sb.from("dlbjj_sessao").upsert({ id: 1, estado: "ligado", visto_em: new Date(Date.now() - 20 * 60_000).toISOString() }, { onConflict: "id" });
    const html = await (await getPainel("/painel/agente")).text();
    expect(html).toContain("Sessão sem sinal");
    await sb.from("dlbjj_sessao").delete().eq("id", 1);
  });
});
