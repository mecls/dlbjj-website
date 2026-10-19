import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { E2E_URL, filaDe } from "../helpers/app";
import { emitirToken } from "@/lib/tokens-db";
import { hashToken } from "@/lib/tokens";

const sb = db();

function form(campos: Record<string, string>): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(campos).toString(),
    redirect: "manual",
  };
}

const BASE = {
  nome: "Carla Teste",
  phone: FIXTURES.leads.concluido.phone,
  email: "",
  morada: "",
  nif: "",
  local_slug: "queluz",
  modalidade: "jiu-jitsu",
  faixa: "branca",
  graus: "0",
  consentimento_rgpd: "on",
};

beforeAll(() => {
  resetDb();
});

describe("Jornada B — inscrição", () => {
  let token: string;

  it("o link abre o formulário pré-preenchido com o nome da lead", async () => {
    token = await emitirToken("inscricao", { leadId: FIXTURES.leads.concluido.id });
    const r = await fetch(`${E2E_URL}/inscricao/${token}`);
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain("<form");
    expect(html).toContain('value="Carla Teste"');
  });

  it("um menor sem encarregado é recusado (AC-4) e nada é escrito", async () => {
    const r = await fetch(`${E2E_URL}/api/inscricao/${token}`, form({ ...BASE, data_nascimento: "2015-05-01" }));
    expect(r.status).toBe(422);
    expect(await r.text()).toContain("Para menores é obrigatório o encarregado de educação");
    const { count } = await sb.from("dlbjj_alunos").select("*", { count: "exact", head: true }).eq("phone", BASE.phone);
    expect(count).toBe(0);
    const { data: t } = await sb.from("dlbjj_tokens").select("usado_em").eq("token_hash", hashToken(token)).single();
    expect(t!.usado_em).toBeNull();
  });

  it("NIF inválido e RGPD em falta também são recusados", async () => {
    const r1 = await fetch(`${E2E_URL}/api/inscricao/${token}`, form({ ...BASE, data_nascimento: "1990-01-01", nif: "123456780" }));
    expect(r1.status).toBe(422);
    expect(await r1.text()).toContain("NIF inválido");
    const r2 = await fetch(`${E2E_URL}/api/inscricao/${token}`, form({ ...BASE, data_nascimento: "1990-01-01", consentimento_rgpd: "" }));
    expect(r2.status).toBe(422);
  });

  it("com o encarregado preenchido cria o aluno, a faixa, liga a lead, usa o token e confirma no WhatsApp", async () => {
    const r = await fetch(
      `${E2E_URL}/api/inscricao/${token}`,
      form({ ...BASE, data_nascimento: "2015-05-01", enc_nome: "Marta Teste", enc_telefone: "351911111111", enc_relacao: "mãe", condicoes_saude: "nenhuma", consentimento_imagem: "on" }),
    );
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("Inscrição recebida. Vais receber uma confirmação no WhatsApp.");

    const { data: aluno } = await sb.from("dlbjj_alunos").select("*").eq("phone", BASE.phone).single();
    expect(aluno).toMatchObject({ nome: "Carla Teste", publico: "kids", local_slug: "queluz", enc_nome: "Marta Teste", consentimento_imagem: true, estado: "ativo" });
    expect(aluno!.consentimento_rgpd_em).not.toBeNull();
    const { data: grad } = await sb.from("dlbjj_graduacoes").select("faixa,graus").eq("aluno_id", aluno!.id);
    expect(grad).toEqual([{ faixa: "branca", graus: 0 }]);
    const { data: lead } = await sb.from("dlbjj_leads").select("status,aluno_id").eq("id", FIXTURES.leads.concluido.id).single();
    expect(lead).toEqual({ status: "inscrito", aluno_id: aluno!.id });
    const { data: t } = await sb.from("dlbjj_tokens").select("usado_em").eq("token_hash", hashToken(token)).single();
    expect(t!.usado_em).not.toBeNull();
    const fila = await filaDe(sb, BASE.phone);
    const confirmacao = fila.find((f) => f.kind === "sistema" && f.corpo.includes("Inscrição recebida"));
    expect(confirmacao?.corpo).toBe("Inscrição recebida, Carla! Bem-vindo/a à família DL-BJJ. 🥋 Quando vieres treinar, manda-me *presente* e eu registo a tua presença.");
  });

  it("o token usado já não abre o formulário (410)", async () => {
    const r = await fetch(`${E2E_URL}/inscricao/${token}`);
    expect(r.status).toBe(410);
    const html = await r.text();
    expect(html).toContain("Este link já não é válido");
    expect(html).not.toContain("<form");
    const r2 = await fetch(`${E2E_URL}/api/inscricao/${token}`, form({ ...BASE, data_nascimento: "1990-01-01" }));
    expect(r2.status).toBe(410);
  });
});

describe("Submissões em simultâneo e em excesso", () => {
  it("dois POSTs ao mesmo tempo com o mesmo token criam UM aluno e UMA confirmação (C1)", async () => {
    const token = await emitirToken("inscricao", { leadId: FIXTURES.leads.novo.id });
    const phone = "351900000821";
    const campos = { ...BASE, nome: "Dupla Toque", phone, data_nascimento: "1990-01-01" };
    const [r1, r2] = await Promise.all([fetch(`${E2E_URL}/api/inscricao/${token}`, form(campos)), fetch(`${E2E_URL}/api/inscricao/${token}`, form(campos))]);
    expect([r1.status, r2.status].sort()).toEqual([200, 410]);
    const { count } = await sb.from("dlbjj_alunos").select("*", { count: "exact", head: true }).eq("phone", phone);
    expect(count).toBe(1);
    const fila = await filaDe(sb, phone);
    expect(fila.filter((f) => f.kind === "sistema")).toHaveLength(1);
  });

  it("o 11.º POST num minuto do mesmo IP leva 429 (I7)", async () => {
    const token = await emitirToken("inscricao", { leadId: FIXTURES.leads.emProgresso.id });
    const ip = { "x-forwarded-for": "203.0.113.7" };
    let ultimo = 0;
    for (let i = 0; i < 11; i++) {
      const r = await fetch(`${E2E_URL}/api/inscricao/${token}`, { ...form({ ...BASE, phone: "351900000822", data_nascimento: "" }), headers: { "content-type": "application/x-www-form-urlencoded", ...ip } });
      ultimo = r.status;
    }
    expect(ultimo).toBe(429);
  });
});

describe("Jornada B′ — link expirado / substituído", () => {
  it("expirado → 410 sem o nome e sem formulário (AC-5)", async () => {
    const token = "expirado-expirado-expirado-expirado-expirado";
    await sb.from("dlbjj_tokens").insert({ token_hash: hashToken(token), kind: "inscricao", lead_id: FIXTURES.leads.novo.id, expira_em: new Date(Date.now() - 1000).toISOString() });
    const r = await fetch(`${E2E_URL}/inscricao/${token}`);
    expect(r.status).toBe(410);
    const html = await r.text();
    expect(html).toContain("Este link já não é válido");
    expect(html).not.toContain("Lead Novo");
    expect(html).not.toContain("<form");
  });

  it("emitir um segundo link revoga o primeiro", async () => {
    const a = await emitirToken("inscricao", { leadId: FIXTURES.leads.emProgresso.id });
    const b = await emitirToken("inscricao", { leadId: FIXTURES.leads.emProgresso.id });
    expect((await fetch(`${E2E_URL}/inscricao/${a}`)).status).toBe(410);
    expect((await fetch(`${E2E_URL}/inscricao/${b}`)).status).toBe(200);
  });
});
