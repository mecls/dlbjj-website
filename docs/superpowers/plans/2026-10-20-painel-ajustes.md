# Painel — ajustes após o primeiro teste — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the six decisions from Miguel's first test of the painel: a cleaner Início, a conversation console with a rail and a model-written summary, classes organised by gym with a weekly timetable, events as a calendar with a modal and a subscribable feed, and Perguntar switched off.

**Architecture:** Same shell and primitives as before (`components/app/*`), server-rendered pages with HTML forms + route handlers + 303. New pure modules (`estadoDaSessao`, `redigir`/`extrairResumo`, `grelhaSemanal`, `icsDe`, `chaveIcs`) carry the logic and are unit-tested; two small client components (a slide-over sheet and a dialog) carry the interaction. The summary lives in its own table so it never touches `dlbjj_leads.updated_at`.

**Tech Stack:** Next.js 16.2 App Router, React 19, Tailwind 4 tokens, Supabase service-role client, OpenAI-compatible client against Ollama Cloud with `OLLAMA_FAKE=1`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-20-painel-ajustes-design.md` (§ references below). The two earlier specs still hold.

## Global Constraints

- Read the Next docs under `node_modules/next/dist/docs/` before route handlers, dynamic segments with a dot (`eventos.ics`), and client/server boundaries (AGENTS.md).
- pt-PT strings; Lisbon time via `lib/tempo.ts`; explicit column selects; fail-closed in production (`isProduction()`).
- Every change to a page keeps the strings and field names the existing e2e tests assert, unless the test is updated in the same task.
- Login codes and token links never reach the model: `redigir()` runs on every message body in the summary prompt (§2.3).
- Summaries are stored in `dlbjj_resumos`, never on `dlbjj_leads` (§2.3, §6.3).
- Run suites with output redirected to the SDD workspace; stop any `next dev` on 3005 before an e2e run; after moving/deleting routes run `rm -rf .next`.
- Commit after every task; never push.

## Review Focus

1. A lead with no messages, or whose thread is only bot/system messages, must not call the model: the rail says "Ainda não há conversa para resumir." and a forced POST comes back with `?erro=sem_conversa` (Task 4 e2e "sem conversa não chama o modelo").
2. Garbage from the model must leave the previous summary in place and show "Não consegui resumir. Tenta outra vez." (Task 3 unit `extrairResumo` on garbage; Task 4 e2e via the fake's `[[lixo]]` trigger).
3. A gym whose classes were all deactivated must show "Sem turmas ativas neste espaço." instead of an empty grid or a crash (Task 5 e2e).
4. Opening `?editar=<id>` of a cancelled event must show it read-only with "Este evento foi cancelado.", not an edit form that would silently un-cancel it (Task 6 e2e).
5. A description with commas, semicolons or line breaks must survive the ICS feed unbroken, and an all-day event must be a `VALUE=DATE` entry (Task 7 unit).

---

## File structure

```
lib/painel/sessao-estado.ts            estadoDaSessao() (pure)
lib/painel/resumo.ts                   redigir, extrairResumo (pure); gerarResumo, lerResumo (DB + model)
lib/llm/fake.ts                        + resumoFake(ultimaMensagem)
lib/aulas/grelha.ts                    grelhaSemanal() (pure)
lib/aulas/espacos.ts                   resumoPorEspaco() (DB)
lib/eventos-ics.ts                     icsDe() (pure)
lib/painel/ics-chave.ts                chaveIcs(), chaveValida()
components/painel/rail-conversa.tsx    the right rail (server)
components/painel/detalhes-sheet.tsx   client: "Detalhes" button + slide-over
components/painel/evento-modal.tsx     client: dialog wrapper (Esc / backdrop → href)
components/painel/copiar.tsx           client: copy-to-clipboard button
app/painel/page.tsx                    Início without the agent card; "Reativações por enviar"
app/painel/layout.tsx                  bell via estadoDaSessao
app/painel/agente/page.tsx             "Proativas hoje: N de T"; "sem sinal" state
app/painel/mensagens/[phone]/page.tsx  centre thread + rail
app/api/painel/leads/[phone]/resumo/route.ts
app/painel/aulas/page.tsx              gym cards + top-class line
app/painel/aulas/espaco/[slug]/page.tsx weekly timetable
app/painel/aulas/[turmaId]/page.tsx    back link → gym
app/painel/eventos/page.tsx            month grid + modal + sync card
app/api/painel/eventos/route.ts, [id]/route.ts, [id]/cancelar/route.ts   carry `mes`
app/api/painel/eventos.ics/route.ts    the feed
supabase/migrations/006_dlbjj_painel_ajustes.sql
deleted: app/painel/perguntar/page.tsx, app/api/painel/perguntar/route.ts, tests/e2e/perguntar.test.ts
tests/unit/{sessao-estado,resumo,grelha,eventos-ics,ics-chave}.test.ts
tests/integration/resumo.test.ts
tests/e2e/{painel-inicio,painel-shell,agente,painel-leads,painel-alunos,painel-eventos,producao}.test.ts (updated), tests/e2e/painel-mensagens.test.ts (new)
```

---

### Task 1: Início, bell and Agente page (§2.1)

**Files:**
- Create: `lib/painel/sessao-estado.ts`
- Modify: `app/painel/page.tsx`, `app/painel/layout.tsx`, `app/painel/agente/page.tsx`, `lib/painel/dashboard.ts`
- Test: `tests/unit/sessao-estado.test.ts`, `tests/e2e/painel-inicio.test.ts`, `tests/e2e/agente.test.ts`

**Interfaces:**
- Produces: `type EstadoSessao = "ligada" | "instavel" | "caida" | "sem_sinal" | "nunca"`; `estadoDaSessao(row: { estado: string; visto_em: string } | null, agora: Date, producao: boolean): { estado: EstadoSessao; alerta: boolean }` — `null` → `nunca` (alerta = `producao`); `caido` → `caida` (alerta); `instavel` → alerta; `ligado` with `visto_em` older than 10 min → `sem_sinal` (alerta); else `ligada` (no alerta). `SEM_SINAL_MS = 10 * 60_000`.
- Layout `sinais()` returns `{ espera, sessaoMal }` with `sessaoMal = estadoDaSessao(row, new Date(), isProduction()).alerta`; bell title "A sessão do WhatsApp precisa de atenção" when lit by the session.
- Dashboard: drop `sessao`, `botLigado`, `proativasHoje`, `tecto` from `NumerosPainel`; page drops the agent card; the fourth academy card reads `rotulo="Reativações por enviar"` `sub="mensagens automáticas agendadas"`.
- Agente page: the session card uses `estadoDaSessao`; `sem_sinal` renders an amber card "Sessão sem sinal há {timeAgo}" + "o worker pode ter parado; runbook docker/README.md"; a new line "Proativas hoje: {orc.proativas} de {tecto}" (tecto from `dlbjj_settings.proativas_por_dia`, default 10) inside the interruptor card.

- [ ] **Step 1: Write the failing tests**

`tests/unit/sessao-estado.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { estadoDaSessao } from "@/lib/painel/sessao-estado";
const agora = new Date("2026-10-20T12:00:00Z");
const ha = (min: number) => new Date(agora.getTime() - min * 60_000).toISOString();
describe("estadoDaSessao", () => {
  it("ligada com batimento recente não alerta", () => expect(estadoDaSessao({ estado: "ligado", visto_em: ha(2) }, agora, true)).toEqual({ estado: "ligada", alerta: false }));
  it("ligada mas sem sinal há mais de 10 min alerta", () => expect(estadoDaSessao({ estado: "ligado", visto_em: ha(11) }, agora, false)).toEqual({ estado: "sem_sinal", alerta: true }));
  it("instável e caída alertam", () => {
    expect(estadoDaSessao({ estado: "instavel", visto_em: ha(1) }, agora, false).alerta).toBe(true);
    expect(estadoDaSessao({ estado: "caido", visto_em: ha(1) }, agora, false)).toEqual({ estado: "caida", alerta: true });
  });
  it("sem linha: alerta só em produção", () => {
    expect(estadoDaSessao(null, agora, true)).toEqual({ estado: "nunca", alerta: true });
    expect(estadoDaSessao(null, agora, false)).toEqual({ estado: "nunca", alerta: false });
  });
});
```
`tests/e2e/painel-inicio.test.ts`: in the first test replace `"Agente de WhatsApp"`, `"o worker ainda não reportou"`, `"Toques pendentes"`, `"Proativas hoje: 0 de 10"` with `expect(html).not.toContain("Agente de WhatsApp")` and `"Reativações por enviar"`; add:
```ts
it("o sino acende quando o worker deixou de dar sinal", async () => {
  await sb.from("dlbjj_sessao").upsert({ id: 1, estado: "ligado", visto_em: new Date(Date.now() - 20 * 60_000).toISOString() }, { onConflict: "id" });
  expect(await (await getPainel("/painel")).text()).toContain('data-sino="ativo"');
  await sb.from("dlbjj_sessao").update({ visto_em: new Date().toISOString() }).eq("id", 1);
  expect(await (await getPainel("/painel/alunos")).text()).toContain('data-sino="inativo"');
  await sb.from("dlbjj_sessao").delete().eq("id", 1);
});
```
`tests/e2e/agente.test.ts`: in the first test add `expect(html).toContain("Proativas hoje: 0 de 10")`; add a test that upserts `ligado` with `visto_em` 20 min ago and asserts `"Sessão sem sinal"`.

- [ ] **Step 2: Run them** — `npx vitest run tests/unit/sessao-estado.test.ts` → FAIL (module missing); `VITEST_E2E=1 npx vitest run tests/e2e/painel-inicio.test.ts tests/e2e/agente.test.ts` → FAIL ("Reativações por enviar" missing, sino inativo, "Proativas hoje" missing on /painel/agente).
- [ ] **Step 3: Implement** `estadoDaSessao`, the layout `sinais()`, the dashboard and page changes, the Agente page states and line.
- [ ] **Step 4: Run** the three files + `npm run lint && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** — `git add lib/painel app/painel tests/unit/sessao-estado.test.ts tests/e2e/painel-inicio.test.ts tests/e2e/agente.test.ts && git commit -m "Início sem o cartão do agente e com 'Reativações por enviar'; o sino acende com batimento parado; Agente mostra as proativas de hoje"`

---

### Task 2: Perguntar switched off (§2.6)

**Files:**
- Delete: `app/painel/perguntar/page.tsx`, `app/api/painel/perguntar/route.ts`, `tests/e2e/perguntar.test.ts`
- Modify: `app/painel/layout.tsx` (nav), `tests/e2e/painel-shell.test.ts`, `AGENTE-WHATSAPP.md` (§1 "O que o Daniel faz no painel": drop Perguntar, add "Perguntar está desligado por agora; o catálogo em `lib/perguntar/` fica"), `README.md` (drop "um chat que responde só com os dados")

- [ ] **Step 1: Write the failing test** — in `tests/e2e/painel-shell.test.ts` remove `"Perguntar"` from the nav list and add `it("Perguntar está desligado", async () => { expect((await getPainel("/painel/perguntar")).status).toBe(404); expect(await (await getPainel("/painel")).text()).not.toContain('href="/painel/perguntar"'); });`
- [ ] **Step 2: Run** `VITEST_E2E=1 npx vitest run tests/e2e/painel-shell.test.ts` → FAIL (200 and the href present).
- [ ] **Step 3: Delete the three files with `git rm`, remove the nav item, update the docs, `rm -rf .next`.** Keep `lib/perguntar/*` and `tests/unit/ferramentas.test.ts`, `tests/integration/ferramentas.test.ts`.
- [ ] **Step 4: Run** the shell test + `npm run typecheck && npm run lint && npm run test:unit` → PASS.
- [ ] **Step 5: Commit** — `git add -A app/painel/perguntar app/api/painel/perguntar tests/e2e/perguntar.test.ts app/painel/layout.tsx tests/e2e/painel-shell.test.ts AGENTE-WHATSAPP.md README.md && git commit -m "Perguntar desligado por agora (página, rota e navegação); o catálogo fica"`

---

### Task 3: The summary — migration, pure parsing, generation (§2.3)

**Files:**
- Create: `supabase/migrations/006_dlbjj_painel_ajustes.sql`, `lib/painel/resumo.ts`
- Modify: `lib/llm/fake.ts`, `tests/helpers/db.ts` (nothing new needed), `AGENTE-WHATSAPP.md` §0 step 1 (add `006`) and §5 (the paragraph from the spec), `docs/PRE-VOO.md` Fase 2 (add `006`)
- Test: `tests/unit/resumo.test.ts`, `tests/integration/resumo.test.ts`, `tests/integration/schema.test.ts` (one assertion)

**Interfaces:**
- Migration: `create table if not exists dlbjj_resumos (lead_id uuid primary key references dlbjj_leads(id) on delete cascade, situacao text not null, quer text not null, mensagens int not null, ate timestamptz not null, em timestamptz not null default now())`, RLS enabled.
- `lib/painel/resumo.ts` (server-only except the two pure functions, which also live there — tests import them through the `server-only` alias):
  - `redigir(body: string): string` — replaces `\*\d{4,8}\*` with `*[código]*` and `/(inscricao|aluno)/[A-Za-z0-9_-]{20,}` with `/$1/[link]`.
  - `interface Resumo { situacao: string; quer: string }`; `extrairResumo(text: string): Resumo | null` — JSON object (via `extractJson` from `lib/bot/nlu.ts`) with non-empty strings `situacao` (≤ 240 chars, truncated) and `quer` (≤ 160); anything else → `null`.
  - `interface ResumoRow extends Resumo { lead_id: string; mensagens: number; ate: string; em: string }`
  - `type ResultadoResumo = "ok" | "sem_conversa" | "resumo"`; `gerarResumo(leadId: string, phone: string): Promise<ResultadoResumo>` — loads the last 60 rows of `dlbjj_mensagens` for `phone` (`role,body,created_at`, newest first, then reversed); if none with `role in ('lead','humano')` → `"sem_conversa"`; builds the prompt lines `"{Cliente|Assistente|Daniel}: {redigir(body)}"`; asks the model (`OLLAMA.fake()` → `resumoFake(ultimaDoCliente)`) for `{"situacao": "...", "quer": "..."}` in pt-PT; `extrairResumo` null → `"resumo"`; else upsert `dlbjj_resumos` with `mensagens = rows.length`, `ate = last row's created_at`, `em = now` → `"ok"`.
  - `lerResumo(leadId: string, ultimaMensagemEm: string | null): Promise<{ resumo: ResumoRow | null; desatualizado: boolean }>` — `desatualizado` = resumo exists and `ultimaMensagemEm > resumo.ate`.
- `lib/llm/fake.ts`: `resumoFake(ultima: string): string` — returns `"isto não é json"` when `ultima` contains `[[lixo]]`, else `JSON.stringify({ situacao: \`A pessoa escreveu "${ultima.slice(0, 60)}" e a conversa está a meio.\`, quer: "Saber mais sobre as aulas." })`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/resumo.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { extrairResumo, redigir } from "@/lib/painel/resumo";
describe("redigir", () => {
  it("esconde códigos e links com token", () => {
    expect(redigir("O teu código é *123456*. Vale 10 minutos.")).toBe("O teu código é *[código]*. Vale 10 minutos.");
    expect(redigir("Preenche http://x/inscricao/abcdefghijklmnopqrstuvwxyz123 hoje")).toBe("Preenche http://x/inscricao/[link] hoje");
    expect(redigir("entra em http://x/aluno/abcdefghijklmnopqrstuvwxyz123")).toBe("entra em http://x/aluno/[link]");
    expect(redigir("olá, tudo bem?")).toBe("olá, tudo bem?");
  });
});
describe("extrairResumo", () => {
  it("aceita o JSON e corta ao tamanho", () => {
    const r = extrairResumo('{"situacao":"' + "a".repeat(300) + '","quer":"treinar"}');
    expect(r!.situacao).toHaveLength(240);
    expect(r!.quer).toBe("treinar");
  });
  it("recusa lixo e campos vazios", () => {
    expect(extrairResumo("isto não é json")).toBeNull();
    expect(extrairResumo('{"situacao":"","quer":"x"}')).toBeNull();
    expect(extrairResumo('{"situacao":"x"}')).toBeNull();
  });
});
```
`tests/integration/resumo.test.ts` (resetDb in beforeAll; `OLLAMA_FAKE=1` comes from `.env.test`):
```ts
it("gera com o fake, guarda em dlbjj_resumos sem tocar em updated_at, e deteta conversa nova", async () => {
  const { emProgresso } = FIXTURES.leads;
  const { data: antes } = await sb.from("dlbjj_leads").select("updated_at").eq("id", emProgresso.id).single();
  expect(await gerarResumo(emProgresso.id, emProgresso.phone)).toBe("sem_conversa");
  await sb.from("dlbjj_mensagens").insert({ lead_id: emProgresso.id, phone: emProgresso.phone, direction: "in", role: "lead", body: "quero treinar jiu-jitsu em São Brás, o código *123456*" });
  expect(await gerarResumo(emProgresso.id, emProgresso.phone)).toBe("ok");
  const { resumo, desatualizado } = await lerResumo(emProgresso.id, (await sb.from("dlbjj_mensagens").select("created_at").eq("phone", emProgresso.phone).order("created_at", { ascending: false }).limit(1).single()).data!.created_at);
  expect(resumo!.situacao).toContain("*[código]*"); // o fake ecoa a última mensagem já redigida
  expect(resumo!.mensagens).toBe(1);
  expect(desatualizado).toBe(false);
  const { data: depois } = await sb.from("dlbjj_leads").select("updated_at").eq("id", emProgresso.id).single();
  expect(depois!.updated_at).toBe(antes!.updated_at);
  await new Promise((r) => setTimeout(r, 20));
  const { data: nova } = await sb.from("dlbjj_mensagens").insert({ lead_id: emProgresso.id, phone: emProgresso.phone, direction: "in", role: "lead", body: "e para crianças?" }).select("created_at").single();
  expect((await lerResumo(emProgresso.id, nova!.created_at)).desatualizado).toBe(true);
  await sb.from("dlbjj_mensagens").insert({ lead_id: emProgresso.id, phone: emProgresso.phone, direction: "in", role: "lead", body: "[[lixo]]" });
  expect(await gerarResumo(emProgresso.id, emProgresso.phone)).toBe("resumo");
  expect((await lerResumo(emProgresso.id, null)).resumo!.mensagens).toBe(1); // o anterior ficou
});
```
`tests/integration/schema.test.ts`: add to the 005 describe an insert into `dlbjj_resumos` for `FIXTURES.leads.novo.id` that succeeds.

- [ ] **Step 2: Run** `npx vitest run tests/unit/resumo.test.ts tests/integration/resumo.test.ts tests/integration/schema.test.ts` → FAIL (module missing / relation missing).
- [ ] **Step 3: Implement** migration, `lib/painel/resumo.ts`, `resumoFake`, docs lines. Model call: same `OpenAI` client pattern as `lib/bot/nlu.ts` (`temperature: 0.2`, `response_format` not required; `extractJson` tolerates prose around the JSON).
- [ ] **Step 4: Run** `npm run test:unit && npm run test:integration && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** — `git add supabase/migrations/006_dlbjj_painel_ajustes.sql lib/painel/resumo.ts lib/llm/fake.ts tests/unit/resumo.test.ts tests/integration/resumo.test.ts tests/integration/schema.test.ts AGENTE-WHATSAPP.md docs/PRE-VOO.md && git commit -m "Resumo da conversa: tabela própria, redação de códigos e links, geração com o modelo (ou o fake)"`

---

### Task 4: The conversation console (§2.2, §2.3 rail)

**Files:**
- Create: `components/painel/rail-conversa.tsx`, `components/painel/detalhes-sheet.tsx`, `app/api/painel/leads/[phone]/resumo/route.ts`
- Modify: `app/painel/mensagens/[phone]/page.tsx`
- Test: `tests/e2e/painel-mensagens.test.ts` (new), `tests/e2e/painel-leads.test.ts` (unchanged assertions must still pass)

**Interfaces:**
- Consumes: Task 3 (`gerarResumo`, `lerResumo`, `ResumoRow`); `LeadActions`, `ThreadBody`, `ReplyBox`, `StatusBadge`; `dataPt`, `diaCurto`, `timeAgo`.
- `RailConversa({ lead, totalMensagens, ultimaMensagemEm, resumo, desatualizado, erro }: { lead: Lead; totalMensagens: number; ultimaMensagemEm: string | null; resumo: ResumoRow | null; desatualizado: boolean; erro?: string })` — `<aside data-rail>` with the five sections of §2.2 (eyebrow captions "Pessoa", "Situação", "Lead", "Ações", "Aluno"). Situação: `totalMensagens === 0` → "Ainda não há conversa para resumir."; no resumo → form POST `/api/painel/leads/{phone}/resumo` with button "Escrever resumo"; resumo → `<p>{situacao}</p><p class=muted>{quer}</p>`, when `desatualizado` → "Há conversa depois disto.", then "{mensagens} mensagens · até {diaCurto(ate)} · {timeAgo(em)}" and the same form with "Atualizar". `erro === "resumo"` → "Não consegui resumir. Tenta outra vez."; `erro === "sem_conversa"` → "Ainda não há conversa para resumir."
- `DetalhesSheet({ children }: { children: React.ReactNode })` — client; `<button data-detalhes>Detalhes</button>` visible below `xl`; open → fixed overlay + right panel `w-[440px] max-w-[92vw]` containing `children`; closes on backdrop, ✕, Esc.
- Route `POST /api/painel/leads/[phone]/resumo`: `sessaoOu401`; lead by phone (404 → `voltar("/painel/mensagens")`); `gerarResumo` → `"ok"` → `voltar(\`/painel/mensagens/${phone}\`, { ok: "resumo" })`, else `{ erro: resultado }`.
- Page: back link; `<div class="xl:grid xl:grid-cols-[minmax(0,1fr)_440px] xl:gap-6">`; left: thread card `flex min-h-[calc(100vh-72px-5rem)] flex-col` with header "Conversa" (+ "bot em pausa" note, + `<DetalhesSheet>` holding a second render of the rail, visible only below `xl`), `ThreadBody`, `ReplyBox`; right: `<RailConversa … />` in `hidden xl:block`. The "Lead não encontrada" branch stays.

- [ ] **Step 1: Write the failing test** — `tests/e2e/painel-mensagens.test.ts`:
```ts
import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { getPainel, postPainel } from "../helpers/painel";
import { inject } from "../helpers/app";
const sb = db();
beforeAll(() => { resetDb(); });
describe("Painel — conversa com painel lateral (design §2.2–§2.3)", () => {
  it("a conversa está ao centro e a pessoa à direita; sem conversa não chama o modelo", async () => {
    const { phone } = FIXTURES.leads.novo;
    const html = await (await getPainel(`/painel/mensagens/${phone}`)).text();
    expect(html).toContain("data-rail");
    expect(html).toContain("data-detalhes");
    for (const s of ["Pessoa", "Situação", "Lead", "Ações", "Aluno", "Ainda não há conversa para resumir."]) expect(html, s).toContain(s);
    expect(html).not.toContain("Escrever resumo");
    const r = await postPainel(`/api/painel/leads/${phone}/resumo`, {});
    expect(r.headers.get("location")).toContain("erro=sem_conversa");
  });
  it("escreve o resumo, mostra-o com a contagem, e avisa quando há conversa nova", async () => {
    const { phone } = FIXTURES.leads.emProgresso;
    await inject({ from: phone, text: "quero treinar em São Brás" });
    let html = await (await getPainel(`/painel/mensagens/${phone}`)).text();
    expect(html).toContain("Escrever resumo");
    const r = await postPainel(`/api/painel/leads/${phone}/resumo`, {});
    expect(r.headers.get("location")).toContain("ok=resumo");
    html = await (await getPainel(`/painel/mensagens/${phone}`)).text();
    expect(html).toContain("quero treinar em São Brás");
    expect(html).toContain("Saber mais sobre as aulas.");
    expect(html).toMatch(/\d+ mensagens · até/);
    expect(html).toContain("Atualizar");
    expect(html).not.toContain("Há conversa depois disto.");
    await inject({ from: phone, text: "e aos sábados?" });
    html = await (await getPainel(`/painel/mensagens/${phone}`)).text();
    expect(html).toContain("Há conversa depois disto.");
  });
  it("lixo do modelo deixa o resumo anterior e avisa", async () => {
    const { phone } = FIXTURES.leads.emProgresso;
    await inject({ from: phone, text: "[[lixo]]" });
    const r = await postPainel(`/api/painel/leads/${phone}/resumo`, {});
    expect(r.headers.get("location")).toContain("erro=resumo");
    const html = await (await getPainel(`/painel/mensagens/${phone}?erro=resumo`)).text();
    expect(html).toContain("Não consegui resumir. Tenta outra vez.");
    expect(html).toContain("Saber mais sobre as aulas.");
  });
});
```
- [ ] **Step 2: Run** `VITEST_E2E=1 npx vitest run tests/e2e/painel-mensagens.test.ts` → FAIL (`data-rail` missing, 404 on the route).
- [ ] **Step 3: Implement** the rail, the sheet, the route and the page.
- [ ] **Step 4: Run** `VITEST_E2E=1 npx vitest run tests/e2e/painel-mensagens.test.ts tests/e2e/painel-leads.test.ts && npm run lint && npm run typecheck` → PASS.
- [ ] **Step 5: Look at it** on `:3005` at 1440px (rail on the right, thread centred, composer at the bottom) and at ~1000px (rail hidden, "Detalhes" opens the sheet). Stop the server after.
- [ ] **Step 6: Commit** — `git add components/painel "app/painel/mensagens/[phone]/page.tsx" "app/api/painel/leads/[phone]/resumo" tests/e2e/painel-mensagens.test.ts && git commit -m "Conversa ao centro com painel lateral: pessoa, situação (resumo pelo modelo), lead, ações, aluno; gaveta 'Detalhes' em ecrãs pequenos"`

---

### Task 5: Classes by gym and the weekly timetable (§2.4)

**Files:**
- Create: `lib/aulas/grelha.ts`, `lib/aulas/espacos.ts`, `app/painel/aulas/espaco/[slug]/page.tsx`
- Modify: `app/painel/aulas/page.tsx`, `app/painel/aulas/[turmaId]/page.tsx` (back link → `/painel/aulas/espaco/${turma.local_slug}`)
- Test: `tests/unit/grelha.test.ts`, `tests/e2e/painel-alunos.test.ts` ("Painel — aulas" describe)

**Interfaces:**
- `grelhaSemanal(turmas: LinhaRanking[]): { dias: number[]; horas: string[]; celulas: Record<string, LinhaRanking[]> }` — `dias` = sorted distinct weekdays present; `horas` = sorted distinct `horario.slice(0,5)`; `celulas[\`${dia}|${hora}\`]` = the turmas running then, sorted by name. Empty input → `{ dias: [], horas: [], celulas: {} }`.
- `resumoPorEspaco(dias: number): Promise<{ slug: string; nome: string; morada: string | null; turmas: number; presencas: number; alunosAtivos: number }[]>` — one entry per `locais` slug that has at least one active turma, in `locais` order, using `rankingAulas(dias)` and a count of `dlbjj_alunos` `estado='ativo'` per `local_slug`.
- `/painel/aulas?dias=` — `PageHeader "Aulas"` + the 30/90 toggle; grid of gym cards (`Card` with name, morada, three numbers) each a `Link` to `/painel/aulas/espaco/{slug}?dias={dias}`; below, when the top class has presences: "Turma mais concorrida: {turma} · {local} · {dias} {hora}" followed by the existing chip `a aula com mais alunos`; total 0 → "Ainda não há presenças registadas."
- `/painel/aulas/espaco/[slug]?dias=` — unknown slug → `notFound()`; header "{nome}" with back link "← Aulas" and the toggle; no turmas → "Sem turmas ativas neste espaço."; else `lg:` table: first column the hours, one column per `dias` (header `NOME_DIA`), cells with blocks (`Link` to `/painel/aulas/{id}`: name, `HH:MM`, "{presencas} presenças · {alunos} alunos"); below `lg` a list grouped by weekday.

- [ ] **Step 1: Write the failing tests**

`tests/unit/grelha.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { grelhaSemanal } from "@/lib/aulas/grelha";
const t = (id: string, dias_semana: number[], horario: string, turma = id) => ({ id, chave: id, local_slug: "sao-bras", turma, dias: "", dias_semana, horario, tipo: "jiu-jitsu" as const, ativa: true, presencas: 0, alunos: 0 });
describe("grelhaSemanal", () => {
  it("dias e horas distintos, blocos por célula, empilha a mesma hora", () => {
    const g = grelhaSemanal([t("a", [1, 3], "19:30:00"), t("b", [1, 3, 5], "06:00:00"), t("c", [1], "19:30:00", "Zeta"), t("d", [2, 4], "20:00:00")]);
    expect(g.dias).toEqual([1, 2, 3, 4, 5]);
    expect(g.horas).toEqual(["06:00", "19:30", "20:00"]);
    expect(g.celulas["1|19:30"].map((x) => x.id)).toEqual(["a", "c"]); // ordenado pelo nome da turma: "a" antes de "Zeta"
    expect(g.celulas["5|06:00"].map((x) => x.id)).toEqual(["b"]);
    expect(g.celulas["2|19:30"]).toBeUndefined();
  });
  it("vazio", () => expect(grelhaSemanal([])).toEqual({ dias: [], horas: [], celulas: {} }));
});
```
`tests/e2e/painel-alunos.test.ts`, replace the "Painel — aulas" first test with:
```ts
it("a página das aulas lista os espaços e assinala a turma mais concorrida", async () => {
  const html = await (await getPainel("/painel/aulas")).text();
  for (const s of ["Queluz", "São Brás", "BJJ Kids", "a aula com mais alunos", 'href="/painel/aulas/espaco/sao-bras?dias=30"']) expect(html, s).toContain(s);
});
it("o horário semanal de São Brás tem a aula das 19:30 à segunda e à quarta, e liga à turma", async () => {
  const html = await (await getPainel("/painel/aulas/espaco/sao-bras")).text();
  expect(html).toContain("segunda");
  expect(html).toContain("quarta");
  expect(html).toContain("19:30");
  const { data: t } = await sb.from("dlbjj_turmas").select("id").eq("chave", "sao-bras|Jiu-Jitsu|Segunda e Quarta|19:30").single();
  expect(html).toContain(`href="/painel/aulas/${t!.id}`);
  expect((await getPainel("/painel/aulas/espaco/nao-existe")).status).toBe(404);
});
it("um espaço sem turmas ativas diz-o", async () => {
  await sb.from("dlbjj_turmas").update({ ativa: false }).eq("local_slug", "queluz");
  expect(await (await getPainel("/painel/aulas/espaco/queluz")).text()).toContain("Sem turmas ativas neste espaço.");
  await sb.from("dlbjj_turmas").update({ ativa: true }).eq("local_slug", "queluz");
});
```
- [ ] **Step 2: Run** `npx vitest run tests/unit/grelha.test.ts; VITEST_E2E=1 npx vitest run tests/e2e/painel-alunos.test.ts` → FAIL.
- [ ] **Step 3: Implement** the two libs and the pages; update the back link.
- [ ] **Step 4: Run** both + `npm run lint && npm run typecheck` → PASS.
- [ ] **Step 5: Look at it** on `:3005`: the gym cards, then São Brás at 1440px (hours down, days across) and ~700px (list). Stop the server after.
- [ ] **Step 6: Commit** — `git add lib/aulas app/painel/aulas tests/unit/grelha.test.ts tests/e2e/painel-alunos.test.ts && git commit -m "Aulas por espaço: cartões por ginásio e horário semanal com presenças; a turma mais concorrida em destaque"`

---

### Task 6: Events as a calendar with a modal (§2.5 first part)

**Files:**
- Create: `components/painel/evento-modal.tsx`
- Modify: `app/painel/eventos/page.tsx`, `app/api/painel/eventos/route.ts`, `app/api/painel/eventos/[id]/route.ts`, `app/api/painel/eventos/[id]/cancelar/route.ts`
- Test: `tests/e2e/painel-eventos.test.ts`

**Interfaces:**
- Consumes: `mesDeCalendario`, `mesValido`, `mesAnterior`, `mesSeguinte` (events only: `turmas = []`, `presencas = []`), `listarEventos`, `eventosDoPainel` (for "Próximos"), `eventoPorId`, `MESES`, `diaCurto`.
- `EventoModal({ titulo, fechar, children }: { titulo: string; fechar: string; children: React.ReactNode })` — client; renders `<div role="dialog" aria-modal="true" aria-label={titulo}>` over a backdrop; `fechar` is the href to navigate to on ✕, backdrop click or Esc (`router.push`); focuses the first `input` on mount.
- Routes: read `mes` from the form (hidden field) and `voltar(\`/painel/eventos\`, { mes, ok: "1" })`; validation errors → `{ mes, erro, novo: dia }` (create) or `{ mes, erro, editar: id }` (edit); cancel → `{ mes, ok: "1" }`.
- Page `?mes=&novo=&editar=&ok=&erro=`: `PageHeader "Eventos"` with `‹ mês` / `Hoje` / `mês ›` and `BotaoLink` "Novo evento" → `?mes=…&novo={hoje}`; month grid (`lg:`) where each in-month day cell is a `Link` to `?mes=…&novo={dia}` and each event chip a `Link` to `?mes=…&editar={id}` (cancelled events are not listed by `listarEventos`); below `lg` the day list; "Próximos" (next 10) under the grid; the sync card is Task 7. When `novo` is a valid date → `<EventoModal titulo="Novo evento" fechar="?mes=…">` with the create form (`dia` prefilled, hidden `mes`); when `editar` resolves → modal "Editar evento" with the edit form + "Cancelar evento" form; when the event is cancelled → modal with "Este evento foi cancelado." and no forms.

- [ ] **Step 1: Write the failing test** — rewrite `tests/e2e/painel-eventos.test.ts`:
```ts
it("o calendário vem primeiro, o modal cria no mês certo, edita e cancela", async () => {
  const hoje = hojeLisboa(); const mes = hoje.slice(0, 7); const dia = somarDias(hoje, 2);
  let html = await (await getPainel(`/painel/eventos?mes=${mes}`)).text();
  expect(html).toContain("Seminário de guarda com convidado");
  expect(html).toContain(`href="/painel/eventos?mes=${mes}&amp;novo=${hoje}"`);
  expect(html).not.toContain('role="dialog"');
  html = await (await getPainel(`/painel/eventos?mes=${mes}&novo=${dia}`)).text();
  expect(html).toContain('role="dialog"');
  expect(html).toContain(`value="${dia}"`);
  const r = await postPainel("/api/painel/eventos", { mes, titulo: "Treino aberto", dia, hora: "19:00", local_slug: "sao-bras", descricao: "Traz rashguard" });
  expect(r.headers.get("location")).toBe(`/painel/eventos?mes=${mes}&ok=1`);
  const { data } = await sb.from("dlbjj_eventos").select("id").eq("titulo", "Treino aberto").single();
  html = await (await getPainel(`/painel/eventos?mes=${mes}&editar=${data!.id}`)).text();
  expect(html).toContain('value="Treino aberto"');
  expect(html).toContain("Cancelar evento");
  await postPainel(`/api/painel/eventos/${data!.id}`, { mes, titulo: "Treino aberto a todos", dia, hora: "19:00", local_slug: "", descricao: "" });
  const ana = await sessaoDe(FIXTURES.alunos.ana.id, FIXTURES.alunos.ana.phone);
  expect(await (await getAluno("/aluno/calendario", ana)).text()).toContain("Treino aberto a todos");
  const c = await postPainel(`/api/painel/eventos/${data!.id}/cancelar`, { mes });
  expect(c.headers.get("location")).toBe(`/painel/eventos?mes=${mes}&ok=1`);
  html = await (await getPainel(`/painel/eventos?mes=${mes}&editar=${data!.id}`)).text();
  expect(html).toContain("Este evento foi cancelado.");
  expect(html).not.toContain("Cancelar evento");
  expect(await (await getAluno("/aluno/calendario", ana)).text()).not.toContain("Treino aberto");
}, 90_000);
it("título vazio reabre o modal com o erro", async () => {
  const r = await postPainel("/api/painel/eventos", { mes: "2026-12", titulo: "", dia: "2026-12-01" });
  expect(r.headers.get("location")).toContain("erro=");
  expect(r.headers.get("location")).toContain("novo=2026-12-01");
  expect(await (await getPainel(r.headers.get("location")!)).text()).toContain("Título obrigatório");
});
it("sem sessão → 401", …unchanged…);
```
- [ ] **Step 2: Run** `VITEST_E2E=1 npx vitest run tests/e2e/painel-eventos.test.ts` → FAIL (no `role="dialog"`, old redirect targets).
- [ ] **Step 3: Implement** the modal, the page and the route changes.
- [ ] **Step 4: Run** the file + `tests/e2e/aluno-paginas.test.ts` + lint + typecheck → PASS.
- [ ] **Step 5: Look at it** on `:3005` (grid, modal open, Esc closes). Stop the server after.
- [ ] **Step 6: Commit** — `git add components/painel/evento-modal.tsx app/painel/eventos app/api/painel/eventos tests/e2e/painel-eventos.test.ts && git commit -m "Eventos: calendário primeiro, modal para criar, editar e cancelar no mês em que se está"`

---

### Task 7: The calendar feed (§2.5 sync)

**Files:**
- Create: `lib/eventos-ics.ts`, `lib/painel/ics-chave.ts`, `app/api/painel/eventos.ics/route.ts`, `components/painel/copiar.tsx`
- Modify: `app/painel/eventos/page.tsx` (sync card), `AGENTE-WHATSAPP.md` (painel section: one line on the feed)
- Test: `tests/unit/eventos-ics.test.ts`, `tests/unit/ics-chave.test.ts`, `tests/e2e/painel-eventos.test.ts` (two tests), `tests/e2e/producao.test.ts` (one assertion)

**Interfaces:**
- `icsDe(eventos: Evento[], agora: Date): string` — CRLF lines: `BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID:-//DL-BJJ//eventos//PT`, `CALSCALE:GREGORIAN`, `X-WR-CALNAME:DL-BJJ — eventos`, then per event `BEGIN:VEVENT`, `UID:{id}@dlbjj.org`, `DTSTAMP:{agora as YYYYMMDDTHHMMSSZ}`, all-day: `DTSTART;VALUE=DATE:YYYYMMDD` + `DTEND;VALUE=DATE:{next day}`; timed: `DTSTART:{instanteLisboa(dia,hora) as UTC YYYYMMDDTHHMMSSZ}` + `DTEND` = +1 h; `SUMMARY:{escapado}`, `DESCRIPTION:{escapado}` when present, `LOCATION:{gym name | Academia DL-BJJ}`, `END:VEVENT`; `END:VCALENDAR`. `escaparIcs(s)` escapes `\`, `;`, `,` and newlines (`\n`).
- `chaveIcs(): string | null` — `HMAC-SHA256(DASHBOARD_PASSWORD, "dlbjj-eventos-ics")` hex, `null` without a password; `chaveValida(dada: string | null): boolean` — timing-safe.
- Route `GET /api/painel/eventos.ics?chave=`: `!supabaseConfigured()` → 503; `permitido("ics", ip, 60, 60)` false → 429; no password → `isProduction() ? 503 : 401`; invalid key → 401; else 200 `text/calendar; charset=utf-8`, `content-disposition: inline; filename="dlbjj-eventos.ics"`, `cache-control: no-store`, body `icsDe(await listarEventos("2000-01-01", "2100-12-31"), new Date())`.
- `Copiar({ texto }: { texto: string })` — client button "Copiar" → `navigator.clipboard.writeText`, label "Copiado" for 2 s.
- Sync card on the Eventos page (under "Próximos"): title "Sincronizar com o teu calendário"; when `chaveIcs()` is null: "Define DASHBOARD_PASSWORD para ativar o feed."; else the `https://{APP_BASE_URL}/api/painel/eventos.ics?chave=…` URL with `Copiar`, the `webcal://` variant as a link, and the two instruction lines from the spec.

- [ ] **Step 1: Write the failing tests**

`tests/unit/eventos-ics.test.ts`:
```ts
const ev = (o: Partial<Evento>): Evento => ({ id: "11111111-1111-1111-1111-111111111111", titulo: "Seminário", descricao: null, dia: "2026-11-08", hora: null, local_slug: null, cancelado_em: null, ...o });
it("dia inteiro, com hora (Lisboa → UTC), escapes e CRLF", () => {
  const ics = icsDe([ev({}), ev({ id: "22222222-2222-2222-2222-222222222222", titulo: "Open Mat, NoGi; livre", descricao: "Traz rashguard\nE água", hora: "19:00", local_slug: "sao-bras", dia: "2026-07-10" })], new Date("2026-10-20T12:00:00Z"));
  expect(ics.split("\r\n")).toContain("DTSTART;VALUE=DATE:20261108");
  expect(ics).toContain("DTEND;VALUE=DATE:20261109");
  expect(ics).toContain("DTSTART:20260710T180000Z"); // 19:00 em Lisboa (verão) = 18:00Z
  expect(ics).toContain("DTEND:20260710T190000Z");
  expect(ics).toContain("SUMMARY:Open Mat\\, NoGi\; livre");
  expect(ics).toContain("DESCRIPTION:Traz rashguard\\nE água");
  expect(ics).toContain("LOCATION:São Brás");
  expect(ics).toContain("LOCATION:Academia DL-BJJ");
  expect(ics).toContain("UID:11111111-1111-1111-1111-111111111111@dlbjj.org");
  expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
});
```
`tests/unit/ics-chave.test.ts`: with `process.env.DASHBOARD_PASSWORD = "teste"` → `chaveIcs()` is 64 hex chars, `chaveValida(chaveIcs())` true, `chaveValida("x")` false, `chaveValida(null)` false; with the password deleted → `chaveIcs()` null and `chaveValida("")` false.

`tests/e2e/painel-eventos.test.ts` add:
```ts
it("o feed ICS serve os eventos com a chave e recusa sem ela", async () => {
  const { chaveIcs } = await import("@/lib/painel/ics-chave");
  const r = await fetch(`${E2E_URL}/api/painel/eventos.ics?chave=${chaveIcs()}`);
  expect(r.status).toBe(200);
  expect(r.headers.get("content-type")).toContain("text/calendar");
  const ics = await r.text();
  expect(ics).toContain("SUMMARY:Seminário de guarda com convidado");
  expect(ics).toContain("SUMMARY:Graduação de fim de ano");
  expect((await fetch(`${E2E_URL}/api/painel/eventos.ics?chave=errada`)).status).toBe(401);
  expect((await fetch(`${E2E_URL}/api/painel/eventos.ics`)).status).toBe(401);
});
it("a página mostra o endereço do feed", async () => {
  const html = await (await getPainel("/painel/eventos")).text();
  expect(html).toContain("Sincronizar com o teu calendário");
  expect(html).toContain("/api/painel/eventos.ics?chave=");
  expect(html).toContain("webcal://");
});
```
`tests/e2e/producao.test.ts`: in the aluno/eventos test add `expect((await fetch(\`${PROD_URL}/api/painel/eventos.ics?chave=x\`)).status).toBe(503);` (no password in the production check).

- [ ] **Step 2: Run** the two unit files and the eventos e2e → FAIL (modules missing, 404 on the feed).
- [ ] **Step 3: Implement.** Check `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md` for segment names containing a dot before creating `app/api/painel/eventos.ics/route.ts` (a plain folder name is fine; the segment matches `/api/painel/eventos.ics` literally).
- [ ] **Step 4: Run** `npm run test:unit && VITEST_E2E=1 npx vitest run tests/e2e/painel-eventos.test.ts tests/e2e/producao.test.ts && npm run lint && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** — `git add lib/eventos-ics.ts lib/painel/ics-chave.ts app/api/painel/eventos.ics components/painel/copiar.tsx app/painel/eventos/page.tsx tests/unit/eventos-ics.test.ts tests/unit/ics-chave.test.ts tests/e2e/painel-eventos.test.ts tests/e2e/producao.test.ts AGENTE-WHATSAPP.md && git commit -m "Feed ICS dos eventos com chave privada, para subscrever no Google Calendar ou no Apple Calendar"`

---

### Task 8: Verify and screenshots

- [ ] **Step 1:** `npm run verify > .superpowers/sdd/2026-10-20-painel-ajustes/verify.log 2>&1; echo VERIFY_EXIT=$? >> …; tail -30 …` → `VERIFY_EXIT=0`.
- [ ] **Step 2:** dev server on 3005, reset the DB to seed, screenshots at 1440px of `/painel`, `/painel/mensagens/<phone>` (with a summary), `/painel/aulas`, `/painel/aulas/espaco/sao-bras`, `/painel/eventos` (modal open) into the scratchpad; keep the server running for Miguel and mint fresh student links.
- [ ] **Step 3:** `dlbjj-build-spec.md` §16: one line pointing at the new design doc. Commit — `git add dlbjj-build-spec.md && git commit -m "Spec: ajustes do painel de 20 de outubro"`.
