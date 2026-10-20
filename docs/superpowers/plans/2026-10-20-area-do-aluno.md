# Área do aluno e painel novo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give students a lasting login (phone + WhatsApp code) into their own area (Início, Histórico, Ranking, Calendário) and rebuild Daniel's painel on the same MatGoat-style shell, with a dashboard, conversations under `/painel/mensagens` and a new Eventos page.

**Architecture:** One server-rendered `AppShell` (sidebar, top bar, drawer on phones) under both `app/aluno/(area)` and `app/painel`; pure statistics in `lib/aluno/estatisticas.ts` fed by explicit-column queries in `lib/aluno/dados.ts`; login codes and sessions stored hashed in two new tables; every WhatsApp message still goes through `dlbjj_fila_saida` (`kind = 'sistema'` for codes). HTML forms + route handlers + 303, as the painel already does.

**Tech Stack:** Next.js 16.2 App Router (async `params`/`searchParams`, `proxy.ts`, `cookies()` from `next/headers`, `NextResponse.cookies.set`), React 19, Tailwind 4 `@theme` tokens, lucide-react, Supabase service-role client, zod 4, Vitest (unit / integration / e2e on `.env.test`).

**Spec:** `docs/superpowers/specs/2026-10-20-area-do-aluno-design.md` (sections cited as §N). Everything in `dlbjj-build-spec.md` still holds.

## Global Constraints

- Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, `.../04-functions/cookies.md` and `.../03-file-conventions/route.md` before touching `proxy.ts`, cookies or route handlers (AGENTS.md).
- pt-PT in every user-visible string; Lisbon time via `lib/tempo.ts` for every "today".
- Explicit column selects; a student never receives another person's health, guardian, contacts, NIF, address, e-mail, birth date or phone (§8).
- Codes and session tokens stored as sha256 only; cookies `httpOnly`, `sameSite: "lax"`, `secure: isProduction()`, `path: "/"`.
- Codes: 10 minutes, 5 attempts, 3 per phone per hour, 10 requests per IP per 15 minutes, 30 per day academy-wide; none while the WhatsApp session is down. Sessions: 90 days (§5.1, §8, §10).
- Reference screenshot: `docs/superpowers/specs/2026-10-20-referencia-matgoat.png` (Read it before Tasks 4, 6, 9, 10).
- Every outgoing message is a row in `dlbjj_fila_saida`; codes use `kind: "sistema"` (§3).
- Design tokens exactly as §4 (`app-bg #ffffff`, `app-page #fafafa`, `app-border #e6e8ec`, `app-text #1f2434`, `app-muted #6b7280`, `app-soft #f1f3f5`, `app-accent #ed1c24`, `app-icon #3b4256`); sidebar 300px from `lg:`; top bar 72px; cards `rounded-xl border border-app-border bg-white`, no shadow; heatmap 12px squares, 3px gaps, colours `app-soft` / `#d9dce3` / `#b8bdc9`.
- No horizontal scroll at 360px; drawer below `lg:`.
- `npm run verify` green at the end; `tests/e2e/producao.test.ts` keeps proving fail-closed.
- Commit after every task; never push.
- Run tests with output redirected to the SDD workspace and read the tail (`> .superpowers/sdd/<plan>/t<N>.log 2>&1; tail -40 ...`).

## Review Focus

1. A student whose `estado` becomes `ex_aluno` while logged in must be locked out on the next request, not keep a 90-day session (test: Task 5 e2e "ex-aluno perde a sessão").
2. A phone typed as `+351 920 000 001` or `920000001` must get a code for `351920000001` (test: Task 5 e2e "normaliza o telemóvel").
3. With the bot switched off, asking for a code must write nothing to the queue and say so (test: Task 5 e2e "com o bot desligado").
4. `?mes=abc` or `?mes=2026-13` on the calendar must show the current month, not crash (test: Task 8 e2e "mês inválido").
5. A student with zero presences in the period must still appear in the ranking, last, and get a position on Início (test: Task 1 unit `ordenarRanking` zeros; Task 7 e2e "Inês aparece no fim").

---

## File structure

```
lib/datas-pt.ts                          month/day names, dataPt, diaMes, mesAno, diaCurto
lib/aluno/estatisticas.ts                pure statistics (§5.6) + calendar cells
lib/aluno/codigos.ts                     login codes (DB)
lib/aluno/sessao.ts                      sessions, cookies, requireAluno
lib/aluno/dados.ts                       student-facing queries (presences, ranking, academy numbers)
lib/eventos.ts                           validarEvento (pure) + event queries/mutations
lib/painel/mensagens.ts                  conversasAEspera()
lib/painel/dashboard.ts                  numerosDoPainel()
lib/config.ts                            + supabaseConfigured()
lib/bot/checkin.ts                       + turmasDoAluno()
lib/tokens.ts                            perfil tokens become single-use
lib/anonimizar.ts                        end sessions, delete codes
components/app/ui.tsx                    Card, Button, Input, Select, Textarea, Pill, PageHeader, SectionTitle, Tabela
components/app/icones.tsx                IconeNome → lucide component
components/app/shell.tsx                 AppShell (server)
components/app/sidebar-nav.tsx           client: nav sections, active item
components/app/drawer.tsx                client: phone menu button + slide-in
components/app/avatar-menu.tsx           client: initials + dropdown (children = server forms)
components/app/stat-card.tsx             StatCard with heatmap
components/app/heatmap.tsx               MapaDeCalor
components/app/faixa.tsx                 Faixa SVG
components/painel/ui.tsx                 re-exports components/app/ui + StatusBadge + timeAgo
app/globals.css                          app-* tokens
app/aluno/(area)/layout.tsx              requireAluno + AppShell (student nav)
app/aluno/(area)/page.tsx                Início
app/aluno/(area)/historico/page.tsx
app/aluno/(area)/ranking/page.tsx
app/aluno/(area)/calendario/page.tsx
app/aluno/entrar/page.tsx                two-step login (no shell)
app/aluno/[token]/page.tsx               rewritten: "Entrar como {nome}" confirm page (GET never consumes)
app/api/aluno/link/route.ts              POST: claim the perfil token → session → 303
app/api/aluno/codigo/route.ts            POST: send code
app/api/aluno/entrar/route.ts            POST: verify code → session
app/api/aluno/sair/route.ts              POST: logout
app/api/aluno/escolher/route.ts          POST: sibling switch
app/painel/layout.tsx                    AppShell (admin nav) when authed, bare otherwise
app/painel/page.tsx                      dashboard (new)
app/painel/mensagens/page.tsx            was app/painel/page.tsx
app/painel/mensagens/[phone]/page.tsx    was app/painel/[phone]/page.tsx
app/painel/eventos/page.tsx
app/api/painel/eventos/route.ts          POST create
app/api/painel/eventos/[id]/route.ts     POST edit
app/api/painel/eventos/[id]/cancelar/route.ts
supabase/migrations/005_dlbjj_area_aluno.sql · supabase/seed.sql
proxy.ts
tests/helpers/aluno.ts
tests/unit/{datas-pt,estatisticas,eventos-validar}.test.ts (+ tokens, checkin-resolver)
tests/integration/{codigos-sessoes,eventos,mensagens-espera}.test.ts (+ schema, anonimizar)
tests/e2e/{painel-shell,aluno-entrar,aluno-inicio,aluno-paginas,painel-eventos,painel-inicio}.test.ts (+ perfil, painel-leads, producao)
```

---

### Task 1: Pure statistics and Portuguese dates

**Files:**
- Create: `lib/datas-pt.ts`, `lib/aluno/estatisticas.ts`
- Modify: `lib/bot/checkin.ts` (export `turmasDoAluno`)
- Test: `tests/unit/datas-pt.test.ts`, `tests/unit/estatisticas.test.ts`, `tests/unit/checkin-resolver.test.ts`

**Interfaces:**
- Consumes: `TurmaRow`, `AlunoMin` from `lib/bot/checkin.ts`; `Graduacao` from `lib/alunos/faixas.ts`; `horaLisboa`, `somarDias`, `diaSemanaDe`, `instanteLisboa` from `lib/tempo.ts`.
- Produces (`lib/datas-pt.ts`): `MESES: string[]` (janeiro…dezembro), `DIAS_CURTOS: string[]` (index 0 = seg … 6 = dom), `dataPt(iso): string` → "19 de outubro de 2026", `diaMes(iso): string` → "19 de outubro", `mesAno(iso): string` (accepts "YYYY-MM" or "YYYY-MM-DD") → "outubro de 2026", `diaCurto(iso): string` → "seg 19 out".
- Produces (`lib/aluno/estatisticas.ts`):
  - `interface PresencaDia { data: string }`
  - `aulasNoMes(presencas: PresencaDia[], hoje: string): number`
  - `aulasDesdeInicio(presencas: PresencaDia[]): number`
  - `diasSeguidos(presencas: PresencaDia[], diasComAula: number[], hoje: string): number` (`diasComAula` = ISO weekdays on which any of the student's turmas run)
  - `posicaoNoRanking(contagens: { alunoId: string; n: number }[], alunoId: string): { posicao: number | null; total: number }` (dense)
  - `interface LinhaRankingAluno { alunoId: string; nome: string; faixa: Graduacao | null; n: number }`
  - `nomesCurtos(nomes: string[]): string[]` (first name; "Ana S." when another entry shares the first name)
  - `ordenarRanking(linhas: LinhaRankingAluno[]): (LinhaRankingAluno & { posicao: number; nomeCurto: string })[]` (desc by `n`, ties by `nome`, dense positions)
  - `interface CelulaCalor { dia: string; n: number; futuro: boolean }`
  - `mapaDeCalor(presencas: PresencaDia[], hoje: string, semanas: number): CelulaCalor[]` (length `semanas*7`, Monday-first, ends on the Sunday of `hoje`'s week)
  - `saudacao(instante: Date): "Bom dia" | "Boa tarde" | "Boa noite"` (Lisbon hour < 12 / < 20 / else)
  - `descreverUltimaAula(data: string, hoje: string): string`
  - `aulasDaSemana(turmas: Pick<TurmaRow, "dias_semana" | "ativa">[]): number`
  - `interface EventoCalendario { id: string; titulo: string; dia: string; hora: string | null; local_slug: string | null }`
  - `interface CelulaCalendario { dia: string; noMes: boolean; hoje: boolean; aulas: { id: string; horario: string; turma: string }[]; eventos: EventoCalendario[]; presente: boolean }`
  - `mesDeCalendario(mes: string, turmas: TurmaRow[], eventos: EventoCalendario[], presencas: PresencaDia[], hoje: string): CelulaCalendario[][]` (rows of 7, from the Monday on/before day 1 to the Sunday on/after the last day)
  - `mesValido(s: string | undefined, hoje: string): string` → `s` when it matches `^\d{4}-(0[1-9]|1[0-2])$`, else `hoje.slice(0, 7)`
  - `mesAnterior(mes: string): string`, `mesSeguinte(mes: string): string`
- Produces (`lib/bot/checkin.ts`): `turmasDoAluno(aluno: AlunoMin, turmas: TurmaRow[]): TurmaRow[]` — active, same `local_slug`, `tipoCombina`, sorted by `horario`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/datas-pt.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { dataPt, diaCurto, diaMes, mesAno } from "@/lib/datas-pt";
describe("datas em pt-PT", () => {
  it("formata", () => {
    expect(dataPt("2026-10-19")).toBe("19 de outubro de 2026");
    expect(diaMes("2026-10-05")).toBe("5 de outubro");
    expect(mesAno("2024-02")).toBe("fevereiro de 2024");
    expect(mesAno("2024-02-01")).toBe("fevereiro de 2024");
    expect(diaCurto("2026-10-19")).toBe("seg 19 out");
    expect(diaCurto("2026-10-25")).toBe("dom 25 out");
  });
});
```

`tests/unit/estatisticas.test.ts` (hoje = `"2026-10-20"`, a Tuesday):
```ts
import { describe, expect, it } from "vitest";
import { aulasDaSemana, aulasDesdeInicio, aulasNoMes, descreverUltimaAula, diasSeguidos, mapaDeCalor, mesAnterior, mesDeCalendario, mesSeguinte, mesValido, nomesCurtos, ordenarRanking, posicaoNoRanking, saudacao } from "@/lib/aluno/estatisticas";
import { instanteLisboa } from "@/lib/tempo";
const p = (...datas: string[]) => datas.map((data) => ({ data }));
const HOJE = "2026-10-20";

describe("contagens", () => {
  it("aulas no mês e desde o início", () => {
    const pres = p("2026-10-19", "2026-10-01", "2026-09-30", "2025-01-05");
    expect(aulasNoMes(pres, HOJE)).toBe(2);
    expect(aulasDesdeInicio(pres)).toBe(4);
  });
  it("aulas da semana soma os dias das turmas ativas", () => {
    expect(aulasDaSemana([{ dias_semana: [1, 3, 5], ativa: true }, { dias_semana: [2, 4], ativa: true }, { dias_semana: [6], ativa: false }])).toBe(5);
  });
});

describe("diasSeguidos", () => {
  const semana = [1, 2, 3, 4, 5];
  it("hoje sem check-in não quebra; fim de semana sem aulas salta; dia com aula sem check-in pára", () => {
    expect(diasSeguidos(p("2026-10-19", "2026-10-16", "2026-10-15"), semana, HOJE)).toBe(3);
  });
  it("hoje com check-in conta", () => {
    expect(diasSeguidos(p("2026-10-20", "2026-10-19", "2026-10-16", "2026-10-15"), semana, HOJE)).toBe(4);
  });
  it("sem turmas não salta nenhum dia", () => {
    expect(diasSeguidos(p("2026-10-19", "2026-10-16"), [], HOJE)).toBe(1);
  });
  it("sem presenças é 0; duas no mesmo dia contam um", () => {
    expect(diasSeguidos([], semana, HOJE)).toBe(0);
    expect(diasSeguidos(p("2026-10-19", "2026-10-19"), semana, HOJE)).toBe(1);
  });
  it("pára aos 366 dias", () => {
    const todos = Array.from({ length: 400 }, (_, i) => ({ data: new Date(Date.UTC(2026, 9, 20 - i)).toISOString().slice(0, 10) }));
    expect(diasSeguidos(todos, [], HOJE)).toBe(366);
  });
});

describe("ranking", () => {
  const c = [{ alunoId: "a", n: 5 }, { alunoId: "b", n: 5 }, { alunoId: "c", n: 3 }, { alunoId: "d", n: 0 }];
  it("posição densa", () => {
    expect(posicaoNoRanking(c, "a")).toEqual({ posicao: 1, total: 4 });
    expect(posicaoNoRanking(c, "b")).toEqual({ posicao: 1, total: 4 });
    expect(posicaoNoRanking(c, "c")).toEqual({ posicao: 2, total: 4 });
    expect(posicaoNoRanking(c, "d")).toEqual({ posicao: 3, total: 4 });
    expect(posicaoNoRanking(c, "zz")).toEqual({ posicao: null, total: 4 });
  });
  it("nomes curtos", () => {
    expect(nomesCurtos(["Ana Silva", "Ana Santos", "Rui Costa"])).toEqual(["Ana S.", "Ana S.", "Rui"]);
  });
  it("ordena, desempata pelo nome e mantém quem tem 0 no fim", () => {
    const r = ordenarRanking([
      { alunoId: "i", nome: "Inês Pereira", faixa: null, n: 0 },
      { alunoId: "r", nome: "Rui Costa", faixa: null, n: 5 },
      { alunoId: "a", nome: "Ana Silva", faixa: null, n: 5 },
      { alunoId: "j", nome: "João Pereira", faixa: null, n: 2 },
    ]);
    expect(r.map((x) => [x.posicao, x.nomeCurto, x.n])).toEqual([[1, "Ana", 5], [1, "Rui", 5], [2, "João", 2], [3, "Inês", 0]]);
  });
});

describe("mapaDeCalor", () => {
  it("12 semanas terminam no domingo desta semana; o futuro fica marcado", () => {
    const m = mapaDeCalor(p("2026-10-19", "2026-10-19", "2026-08-03"), HOJE, 12);
    expect(m).toHaveLength(84);
    expect(m[0]).toEqual({ dia: "2026-08-03", n: 1, futuro: false });
    expect(m.at(-1)).toEqual({ dia: "2026-10-25", n: 0, futuro: true });
    expect(m.find((c) => c.dia === "2026-10-19")!.n).toBe(2);
    expect(m.find((c) => c.dia === "2026-10-20")!.futuro).toBe(false);
    expect(m.find((c) => c.dia === "2026-10-21")!.futuro).toBe(true);
  });
});

describe("texto", () => {
  it("saudação pela hora de Lisboa", () => {
    expect(saudacao(instanteLisboa(HOJE, "11:59"))).toBe("Bom dia");
    expect(saudacao(instanteLisboa(HOJE, "12:00"))).toBe("Boa tarde");
    expect(saudacao(instanteLisboa(HOJE, "19:59"))).toBe("Boa tarde");
    expect(saudacao(instanteLisboa(HOJE, "20:00"))).toBe("Boa noite");
  });
  it("última aula", () => {
    expect(descreverUltimaAula("2026-10-20", HOJE)).toBe("hoje (20 de outubro)");
    expect(descreverUltimaAula("2026-10-19", HOJE)).toBe("ontem (19 de outubro)");
    expect(descreverUltimaAula("2026-10-17", HOJE)).toBe("há 3 dias (17 de outubro)");
    expect(descreverUltimaAula("2026-10-13", HOJE)).toBe("há 7 dias (13 de outubro)");
    expect(descreverUltimaAula("2026-10-12", HOJE)).toBe("em 12 de outubro");
    expect(descreverUltimaAula("2026-09-02", HOJE)).toBe("em 2 de setembro");
  });
});

describe("calendário", () => {
  const turma = { id: "t1", chave: "k", local_slug: "sao-bras", turma: "Jiu-Jitsu", dias: "Terça e Quinta", dias_semana: [2, 4], horario: "20:00:00", tipo: "jiu-jitsu" as const, ativa: true };
  const evento = { id: "e1", titulo: "Seminário", dia: "2026-10-20", hora: "10:00", local_slug: null };
  it("outubro de 2026 começa na segunda 28 de setembro e tem 5 linhas", () => {
    const m = mesDeCalendario("2026-10", [turma], [evento], p("2026-10-19"), HOJE);
    expect(m).toHaveLength(5);
    expect(m[0][0]).toMatchObject({ dia: "2026-09-28", noMes: false });
    expect(m[4][6]).toMatchObject({ dia: "2026-11-01", noMes: false });
    const dia20 = m.flat().find((c) => c.dia === "2026-10-20")!;
    expect(dia20).toMatchObject({ hoje: true, noMes: true, presente: false, aulas: [{ id: "t1", horario: "20:00", turma: "Jiu-Jitsu" }], eventos: [evento] });
    expect(m.flat().find((c) => c.dia === "2026-10-19")!.presente).toBe(true);
    expect(m.flat().find((c) => c.dia === "2026-10-21")!.aulas).toEqual([]);
  });
  it("fevereiro de 2027 começa a uma segunda e tem 4 linhas", () => {
    expect(mesDeCalendario("2027-02", [], [], [], HOJE)).toHaveLength(4);
  });
  it("mês válido, anterior e seguinte", () => {
    expect(mesValido("abc", HOJE)).toBe("2026-10");
    expect(mesValido("2026-13", HOJE)).toBe("2026-10");
    expect(mesValido("2025-02", HOJE)).toBe("2025-02");
    expect(mesAnterior("2026-01")).toBe("2025-12");
    expect(mesSeguinte("2026-12")).toBe("2027-01");
  });
});
```

Append to `tests/unit/checkin-resolver.test.ts`:
```ts
import { turmasDoAluno } from "@/lib/bot/checkin";
it("turmasDoAluno: ativas, do espaço, do tipo, por hora", () => {
  const t = (id: string, local: string, tipo: "kids" | "jiu-jitsu" | "mma" | "misto", horario: string, ativa = true) => ({ id, chave: id, local_slug: local, turma: id, dias: "", dias_semana: [1], horario, tipo, ativa });
  const ana = { id: "a", nome: "Ana", publico: "adulto" as const, modalidade: "jiu-jitsu" as const, local_slug: "sao-bras" };
  const r = turmasDoAluno(ana, [t("mma", "sao-bras", "mma", "18:30"), t("jj", "sao-bras", "jiu-jitsu", "19:30"), t("livre", "sao-bras", "misto", "06:00"), t("q", "queluz", "jiu-jitsu", "08:00"), t("off", "sao-bras", "jiu-jitsu", "07:00", false)]);
  expect(r.map((x) => x.id)).toEqual(["livre", "jj"]);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/datas-pt.test.ts tests/unit/estatisticas.test.ts tests/unit/checkin-resolver.test.ts`
Expected: FAIL — cannot resolve `@/lib/datas-pt`, `@/lib/aluno/estatisticas`; `turmasDoAluno` is not exported.

- [ ] **Step 3: Implement `lib/datas-pt.ts`, `lib/aluno/estatisticas.ts`, export `turmasDoAluno`**

`diasSeguidos`: build a `Set` of presence dates; if `hoje` is in it count 1; then for `i = 1..366` take `somarDias(hoje, -i)`: in set → +1; not in set and `diasComAula.length > 0 && !diasComAula.includes(diaSemanaDe(dia))` → continue; otherwise stop. `mapaDeCalor`: last day = `somarDias(hoje, 7 - diaSemanaDe(hoje))`, first = `somarDias(last, -(semanas*7 - 1))`. `mesDeCalendario`: `hora` from `horario.slice(0, 5)`. No DB imports in this file (it is unit-tested without Supabase).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit`
Expected: all unit files PASS (existing 138 + new).

- [ ] **Step 5: Commit**

```bash
git add lib/datas-pt.ts lib/aluno/estatisticas.ts lib/bot/checkin.ts tests/unit
git commit -m "Estatísticas puras da área do aluno: mês, início, dias seguidos, ranking, mapa de calor, calendário"
```

---

### Task 2: Migration 005 and seed

**Files:**
- Create: `supabase/migrations/005_dlbjj_area_aluno.sql`
- Modify: `supabase/seed.sql`, `tests/helpers/db.ts` (FIXTURES.eventos), `tests/integration/schema.test.ts`, `AGENTE-WHATSAPP.md` §0 step 1 (add `005`), `docs/PRE-VOO.md` Fase 2 (add `005`)

**Interfaces:**
- Produces: tables `dlbjj_codigos_login`, `dlbjj_sessoes_aluno`, `dlbjj_eventos` exactly as §7 (plus `updated_at` trigger on `dlbjj_eventos` using the existing `dlbjj_set_updated_at()`), RLS enabled on all three, and `dlbjj_alunos.ranking_visivel boolean not null default true`. Seed: extra presences dated 31–70 days ago (never ≤ 30 days, so `tests/integration/ranking.test.ts` keeps its counts): Ana 12 rows (alternate `sao-bras|Jiu-Jitsu|Segunda e Quarta|19:30` and `sao-bras|Jiu-Jitsu|Segunda, Quarta e Sexta|06:00` at ha_dias 32,34,37,39,44,46,51,53,58,60,65,67), Rui 9 (33,36,40,43,47,50,54,61,68 on `queluz|Jiu-Jitsu (Adultos)|Terça, Quarta e Sexta|08:00`), João 9 (31,33,38,40,45,47,52,59,66) and Inês 5 (33,40,47,54,61) on `kids-amadora|Kids|Segunda, Quarta e Sexta|18:30`; two events inserted only when the table is empty: `('c0000000-0000-0000-0000-000000000001', 'Seminário de guarda com convidado', 'queluz', current_date + 5, '10:00')` and `('c0000000-0000-0000-0000-000000000002', 'Graduação de fim de ano', null, current_date + 20, '18:00')`. `FIXTURES.eventos = { seminario: { id: "c0000000-…01" }, graduacao: { id: "c0000000-…02" } }`.

- [ ] **Step 1: Write the failing test** — append to `tests/integration/schema.test.ts`:

```ts
describe("005_dlbjj_area_aluno", () => {
  it("tem as tabelas de códigos, sessões e eventos, e as fixtures", async () => {
    const codigo = await sb.from("dlbjj_codigos_login").insert({ phone: "351920000001", codigo_hash: "x".repeat(64), expira_em: new Date(Date.now() + 600_000).toISOString() }).select("id,tentativas").single();
    expect(codigo.error).toBeNull();
    expect(codigo.data!.tentativas).toBe(0);
    const sessao = await sb.from("dlbjj_sessoes_aluno").insert({ token_hash: "s".repeat(64), phone: "351920000001", aluno_id: FIXTURES.alunos.ana.id, expira_em: new Date(Date.now() + 600_000).toISOString() });
    expect(sessao.error).toBeNull();
    const { data: eventos } = await sb.from("dlbjj_eventos").select("id,titulo,local_slug,hora").order("dia");
    expect(eventos).toHaveLength(2);
    expect(eventos![0]).toMatchObject({ id: FIXTURES.eventos.seminario.id, local_slug: "queluz", hora: "10:00:00" });
    expect(eventos![1]).toMatchObject({ id: FIXTURES.eventos.graduacao.id, local_slug: null });
    const { count } = await sb.from("dlbjj_presencas").select("*", { count: "exact", head: true }).eq("aluno_id", FIXTURES.alunos.ana.id);
    expect(count).toBe(18); // 6 recentes + 12 antigas
    const { data: ana } = await sb.from("dlbjj_alunos").select("ranking_visivel").eq("id", FIXTURES.alunos.ana.id).single();
    expect(ana!.ranking_visivel).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/integration/schema.test.ts`
Expected: FAIL — relation "dlbjj_codigos_login" does not exist.

- [ ] **Step 3: Write the migration and the seed additions**

Migration: §7 DDL verbatim, idempotent (`create table if not exists`, `create index if not exists`), `alter table … enable row level security` for the three tables, `drop trigger if exists` + `create trigger dlbjj_eventos_updated_at before update on dlbjj_eventos for each row execute function dlbjj_set_updated_at()`. Seed: new `insert … select … from (values …) join dlbjj_turmas … on conflict do nothing` block for the old presences; events block guarded by `where not exists (select 1 from dlbjj_eventos)`.

- [ ] **Step 4: Run the integration suite**

Run: `npx vitest run tests/integration`
Expected: PASS, including `ranking.test.ts` unchanged (kids 9 / queluz 5 / livre 1 / 7-day kids 5).

- [ ] **Step 5: Commit**

```bash
git add supabase tests/helpers/db.ts tests/integration/schema.test.ts AGENTE-WHATSAPP.md docs/PRE-VOO.md
git commit -m "Migração 005: códigos de login, sessões de aluno e eventos; seed com presenças antigas e dois eventos"
```

---

### Task 3: Login codes, sessions, anonymisation hooks

**Files:**
- Create: `lib/aluno/codigos.ts`, `lib/aluno/sessao.ts`
- Modify: `lib/anonimizar.ts`, `app/api/cron/anonimizar/route.ts`, `lib/config.ts`
- Test: `tests/integration/codigos-sessoes.test.ts`, `tests/integration/anonimizar.test.ts`

**Interfaces:**
- Consumes: `gerarToken`, `hashToken` from `lib/tokens.ts`; `alunosDoTelefone`, `AlunoPublico` from `lib/alunos/consultas.ts`; `isProduction` from `lib/config.ts`; `cookies` from `next/headers`; `redirect` from `next/navigation`.
- Produces (`lib/config.ts`): `supabaseConfigured(): boolean` = both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set (move the private copy out of `app/painel/page.tsx`).
- Produces (`lib/aluno/codigos.ts`, server-only):
  - `VALIDADE_CODIGO_MIN = 10`, `MAX_TENTATIVAS = 5`
  - `gerarCodigo(): string` (6 digits, `randomInt(0, 1_000_000)` zero-padded)
  - `hashCodigo(phone: string, codigo: string): string` (sha256 of `${phone}:${codigo}`)
  - `emitirCodigo(phone: string): Promise<string>` — inserts the row, returns the clear code
  - `type ResultadoCodigo = "ok" | "errado" | "bloqueado" | "nenhum"`
  - `verificarCodigo(phone: string, codigo: string): Promise<ResultadoCodigo>` — newest row for the phone with `usado_em is null` and `expira_em > now`; none → `"nenhum"`; `tentativas >= 5` → `"bloqueado"`; hash mismatch → `tentativas + 1`, returns `"bloqueado"` when that made it 5, else `"errado"`; match → `usado_em = now`, `"ok"`
  - `apagarCodigosAntigos(horas = 24): Promise<void>`
- Produces (`lib/aluno/sessao.ts`, server-only):
  - `COOKIE_SESSAO = "dlbjj_aluno"`, `COOKIE_ENTRAR = "dlbjj_entrar"`, `VALIDADE_SESSAO_DIAS = 90`, `VALIDADE_ENTRAR_S = 600`
  - `interface SessaoRow { token_hash: string; phone: string; aluno_id: string; expira_em: string; criado_em: string; ultimo_uso_em: string | null; terminada_em: string | null }`
  - `opcoesCookie(maxAge: number): { httpOnly: true; sameSite: "lax"; secure: boolean; path: "/"; maxAge: number }`
  - `criarSessao(phone: string, alunoId: string): Promise<string>` (raw token)
  - `lerSessao(token: string): Promise<SessaoRow | null>` (live only; touches `ultimo_uso_em`)
  - `trocarAluno(token: string, alunoId: string): Promise<boolean>` (false unless `alunoId` ∈ `alunosDoTelefone(phone)`)
  - `terminarSessao(token: string): Promise<void>`, `terminarSessoesDe(alunoId: string): Promise<void>`, `apagarSessoesExpiradas(dias = 30): Promise<void>`
  - `interface ContextoAluno { sessao: SessaoRow; aluno: AlunoPublico; irmaos: AlunoPublico[] }` (`irmaos` excludes `aluno`)
  - `sessaoAluno(): Promise<ContextoAluno | null>` — null when no cookie, no live row, `!supabaseConfigured()`, or the session's `aluno_id` is not among `alunosDoTelefone(phone)` (estado no longer ativo/inativo)
  - `requireAluno(): Promise<ContextoAluno>` — `redirect("/aluno/entrar")` otherwise
  - `alunoOu401(): Promise<ContextoAluno | NextResponse>` (401 "Não autorizado")
- `lib/anonimizar.ts`: `anonimizarAluno` also calls `terminarSessoesDe(id)` and deletes `dlbjj_codigos_login` rows for the phone. Cron adds `apagarCodigosAntigos()` and `apagarSessoesExpiradas()` to its `Promise.all` (errors reported like the others).

- [ ] **Step 1: Write the failing tests**

`tests/integration/codigos-sessoes.test.ts`:
```ts
import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { emitirCodigo, hashCodigo, verificarCodigo } from "@/lib/aluno/codigos";
import { apagarSessoesExpiradas, criarSessao, lerSessao, terminarSessao, terminarSessoesDe, trocarAluno } from "@/lib/aluno/sessao";
const sb = db();
beforeAll(() => { resetDb(); });

describe("códigos de login", () => {
  it("emite 6 dígitos e guarda só o hash", async () => {
    const codigo = await emitirCodigo("351920000001");
    expect(codigo).toMatch(/^\d{6}$/);
    const { data } = await sb.from("dlbjj_codigos_login").select("codigo_hash,tentativas").eq("phone", "351920000001").order("created_at", { ascending: false }).limit(1).single();
    expect(data!.codigo_hash).toBe(hashCodigo("351920000001", codigo));
    expect(data!.codigo_hash).not.toContain(codigo);
  });
  it("errado incrementa; certo usa; usado não volta a servir", async () => {
    const codigo = await emitirCodigo("351920000002");
    expect(await verificarCodigo("351920000002", "000000")).toBe("errado");
    expect(await verificarCodigo("351920000002", codigo)).toBe("ok");
    expect(await verificarCodigo("351920000002", codigo)).toBe("nenhum");
  });
  it("à quinta errada bloqueia, e o certo já não entra", async () => {
    const codigo = await emitirCodigo("351920000003");
    for (let i = 0; i < 4; i++) expect(await verificarCodigo("351920000003", "111111")).toBe("errado");
    expect(await verificarCodigo("351920000003", "111111")).toBe("bloqueado");
    expect(await verificarCodigo("351920000003", codigo)).toBe("bloqueado");
  });
  it("expirado é como se não existisse", async () => {
    const codigo = await emitirCodigo("351920000001");
    await sb.from("dlbjj_codigos_login").update({ expira_em: new Date(Date.now() - 1000).toISOString() }).eq("phone", "351920000001");
    expect(await verificarCodigo("351920000001", codigo)).toBe("nenhum");
  });
});

describe("sessões de aluno", () => {
  it("cria, lê, troca de irmão só dentro do telemóvel, termina", async () => {
    const { joao, ines, ana } = FIXTURES.alunos;
    const token = await criarSessao(joao.phone, joao.id);
    expect(token).toHaveLength(43);
    expect((await lerSessao(token))?.aluno_id).toBe(joao.id);
    expect(await lerSessao("nao-existe")).toBeNull();
    expect(await trocarAluno(token, ana.id)).toBe(false);
    expect(await trocarAluno(token, ines.id)).toBe(true);
    expect((await lerSessao(token))?.aluno_id).toBe(ines.id);
    await terminarSessao(token);
    expect(await lerSessao(token)).toBeNull();
  });
  it("terminarSessoesDe e limpeza das expiradas", async () => {
    const { ana } = FIXTURES.alunos;
    const t1 = await criarSessao(ana.phone, ana.id);
    await terminarSessoesDe(ana.id);
    expect(await lerSessao(t1)).toBeNull();
    const t2 = await criarSessao(ana.phone, ana.id);
    await sb.from("dlbjj_sessoes_aluno").update({ expira_em: new Date(Date.now() - 40 * 86_400_000).toISOString() }).eq("phone", ana.phone);
    await apagarSessoesExpiradas(30);
    const { count } = await sb.from("dlbjj_sessoes_aluno").select("*", { count: "exact", head: true }).eq("phone", ana.phone);
    expect(count).toBe(0);
    expect(await lerSessao(t2)).toBeNull();
  });
});
```

Append to the first `describe` in `tests/integration/anonimizar.test.ts` (the one that anonymises `alunoId`): before calling `anonimizarAntigos`, create a session with `criarSessao(phone, alunoId)` and a code with `emitirCodigo(phone)`; after, assert `lerSessao(token)` is null and `dlbjj_codigos_login` has no row for `phone`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/integration/codigos-sessoes.test.ts tests/integration/anonimizar.test.ts`
Expected: FAIL — cannot resolve `@/lib/aluno/codigos` / `@/lib/aluno/sessao`.

- [ ] **Step 3: Implement the two modules, `supabaseConfigured()`, the anonymisation hook and the cron cleanup**

`sessaoAluno()` is the only function that reads `cookies()`; everything else takes the token so it is testable outside Next.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/integration`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/aluno/codigos.ts lib/aluno/sessao.ts lib/anonimizar.ts lib/config.ts app/api/cron/anonimizar/route.ts app/painel/page.tsx tests/integration
git commit -m "Códigos de login e sessões de aluno (hash, 10 min, 5 tentativas, 90 dias); anonimizar termina sessões"
```

---

### Task 4: Design tokens, primitives and the shared shell (painel first)

**Files:**
- Create: `components/app/ui.tsx`, `components/app/icones.tsx`, `components/app/shell.tsx`, `components/app/sidebar-nav.tsx`, `components/app/drawer.tsx`, `components/app/avatar-menu.tsx`, `components/app/stat-card.tsx`, `components/app/heatmap.tsx`, `components/app/faixa.tsx`
- Modify: `app/globals.css`, `components/painel/ui.tsx`, `app/painel/layout.tsx`
- Test: `tests/e2e/painel-shell.test.ts`

**Interfaces:**
- Consumes: `isAuthed`, `logoutAction`; `RealtimeRefresher`; `cn`; `CelulaCalor` (Task 1); `Faixa`, `FAIXA_LABEL` from `lib/alunos/faixas.ts`.
- Produces (`components/app/icones.tsx`): `type IconeNome = "inicio" | "historico" | "ranking" | "calendario" | "mensagens" | "alunos" | "aulas" | "eventos" | "reativacao" | "perguntar" | "agente" | "whatsapp" | "site" | "sair" | "sino" | "menu" | "presencas" | "inscricoes" | "turma"`; `Icone({ nome, className })` → lucide (`House, Activity, Trophy, CalendarDays, MessageSquare, Users, Dumbbell, CalendarPlus, RotateCcw, Sparkles, Bot, MessageCircle, Globe, LogOut, Bell, Menu, CalendarCheck, UserPlus, LayoutGrid`), `strokeWidth={1.75}`.
- Produces (`components/app/shell.tsx`):
  - `interface NavItem { href: string; label: string; icone: IconeNome; badge?: number; exact?: boolean }`
  - `interface NavSection { caption?: string; items: NavItem[] }`
  - `AppShell({ nav, rodape, utilizador, sino, children }: { nav: NavSection[]; rodape: NavItem[]; utilizador: { nome: string; iniciais: string; menu: React.ReactNode }; sino?: { href: string; ativo: boolean; titulo: string }; children: React.ReactNode })` — server component: `<div id="shell" className="min-h-screen bg-app-bg text-app-text lg:grid lg:grid-cols-[300px_1fr]">`, `<aside id="sidebar" className="hidden lg:flex …">` with `<img src="/brand/logo.png" alt="DL-BJJ" className="mx-auto h-16">` (the wordmark is white-on-dark and vanishes here), `SidebarNav`, then the `rodape` list; top bar `<header className="h-[72px] border-b border-app-border">` with the `Drawer` (phone only, `data-drawer`), bell (`sino.ativo` → red dot, `title={sino.titulo}`), `AvatarMenu`; `<main className="mx-auto w-full max-w-[1360px] px-4 py-6 lg:px-12 lg:py-10">`.
  - `SidebarNav({ nav, rodape }: { nav: NavSection[]; rodape?: NavItem[] })` — client; active when `pathname === href` (`exact`) or `pathname.startsWith(href)` otherwise; active item `bg-app-soft font-medium`; badge `rounded-full bg-app-accent text-white text-[11px] px-1.5`.
  - `Drawer({ nav, rodape })` — client; `<button aria-label="Menu" data-drawer>` opens a fixed panel (`w-[300px]`) + backdrop; closes on pathname change and backdrop click; `lg:hidden`.
  - `AvatarMenu({ nome, iniciais, children })` — client; 36px round `bg-app-soft` initials button; dropdown with `nome` and `children`.
- Produces (`components/app/ui.tsx`): `Card`, `Button` (variants `primary` = `bg-app-accent text-white`, `outline`, `ghost`, `danger`; keep `default` as alias of `primary` so existing callers compile), `Input`, `Select`, `Textarea` (all `rounded-lg border border-app-border px-3 py-2 text-sm`), `Pill({ cor?: "cinza" | "verde" | "amarelo" | "vermelho" | "azul" })`, `PageHeader({ titulo, children })` (h1 `text-[28px] font-bold tracking-tight` + right slot), `SectionTitle({ emoji?, children })` (h2 `text-[22px] font-bold`), `Tabela` (`<table className="w-full text-sm">` with `thead` muted uppercase 11px, rows `border-t border-app-border`).
- Produces (`components/app/stat-card.tsx`): `StatCard({ icone, valor, rotulo, sub, href, mapa }: { icone: IconeNome; valor: string | number; rotulo: string; sub?: string; href?: string; mapa?: CelulaCalor[] })` — card `relative overflow-hidden p-6`, icon 28px top-left, `MapaDeCalor` absolutely at the right (`pointer-events-none`), `<p className="text-[32px] font-bold leading-none">`, label `text-[15px] text-app-muted`; wraps in `<Link>` when `href`.
- Produces (`components/app/heatmap.tsx`): `MapaDeCalor({ celulas, className }: { celulas: CelulaCalor[]; className?: string })` — `grid grid-rows-7 grid-flow-col gap-[3px]`, cells `size-3 rounded-[2px]`, `n === 0 → bg-app-soft`, `n === 1 → bg-[#d9dce3]`, `n >= 2 → bg-[#b8bdc9]`, `futuro → bg-transparent`; each cell `title="{dia}: {n}"`.
- Produces (`components/app/faixa.tsx`): `Faixa({ faixa, graus, className }: { faixa: Faixa; graus: number; className?: string })` — inline SVG 96×28, colours per §4, tip black (red for `preta`), `graus` white stripes.
- `components/painel/ui.tsx`: `export * from "@/components/app/ui"` plus the existing `StatusBadge` and `timeAgo`.
- `app/painel/layout.tsx`: `const authed = await isAuthed();` — not authed → `<div className="min-h-screen bg-app-page text-app-text">{children}</div>`; authed → `AppShell` with `nav = [{ items: [Início /painel exact] }, { caption: "ACADEMIA", items: [Mensagens /painel/mensagens, Alunos /painel/alunos, Aulas /painel/aulas, Eventos /painel/eventos, Reativação /painel/reativacao] }, { caption: "FERRAMENTAS", items: [Perguntar /painel/perguntar, Agente /painel/agente] }]`, `rodape = [Site "/" icone site]`, `utilizador = { nome: "Daniel", iniciais: "DL", menu: <form action={logoutAction}><button>Sair</button></form> }`, no `sino` yet (Task 9), `RealtimeRefresher` kept.
- `app/globals.css`: add the eight `--color-app-*` tokens to `@theme`.

- [ ] **Step 1: Write the failing test** — `tests/e2e/painel-shell.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { getPainel } from "../helpers/painel";
beforeAll(() => { resetDb(); });

describe("Painel — shell partilhado (design §4, §6)", () => {
  it("as páginas autenticadas têm a barra lateral com a navegação do Daniel", async () => {
    const html = await (await getPainel("/painel/alunos")).text();
    expect(html).toContain('id="sidebar"');
    expect(html).toContain("/brand/logo.png");
    for (const item of ["Início", "Mensagens", "Alunos", "Aulas", "Eventos", "Reativação", "Perguntar", "Agente", "Sair"]) expect(html, item).toContain(item);
    expect(html).toContain("data-drawer");
    expect(html).toContain(">DL<");
  });
  it("o login não tem barra lateral", async () => {
    const html = await (await getPainel("/painel/login", false)).text();
    expect(html).not.toContain('id="sidebar"');
    expect(html).toContain("/brand/logo.png");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `VITEST_E2E=1 npx vitest run tests/e2e/painel-shell.test.ts`
Expected: FAIL — `id="sidebar"` not found.

- [ ] **Step 3: Implement tokens, primitives, shell and the painel layout; give the login page the logo above its card** (`app/painel/login/page.tsx`: `<img src="/brand/logo.png" alt="DL-BJJ" className="mx-auto mb-6 h-20">`; full restyle is Task 10).

Read `node_modules/next/dist/docs/01-app/01-getting-started/` on client/server component boundaries before writing `sidebar-nav.tsx`/`drawer.tsx`/`avatar-menu.tsx`: they receive only serialisable props (`NavItem[]`) and `children`.

- [ ] **Step 4: Run the shell test, then lint and typecheck**

Run: `VITEST_E2E=1 npx vitest run tests/e2e/painel-shell.test.ts && npm run lint && npm run typecheck`
Expected: PASS, no lint errors (watch `react-hooks/purity`: no `Date.now()` in render).

- [ ] **Step 5: Look at it** — `npm run dev -- -p 3005`, open `http://localhost:3005/painel/alunos` in Chrome at 1440px and 375px (claude-in-chrome `resize_window`). Expected: 300px white sidebar with the logo, captions ACADEMIA/FERRAMENTAS, active item grey; 72px top bar with avatar "DL"; at 375px no sidebar, a menu button opens the drawer, no horizontal scroll. Fix until it matches, then stop the server.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css components/app components/painel/ui.tsx app/painel/layout.tsx app/painel/login/page.tsx tests/e2e/painel-shell.test.ts
git commit -m "Shell partilhado: barra lateral, barra de topo, gaveta no telemóvel, cartões, mapa de calor, faixa; painel usa-o"
```

---

### Task 5: Student login (code, link, siblings, logout) and the `/aluno` area skeleton

**Files:**
- Create: `app/aluno/entrar/page.tsx`, `app/api/aluno/codigo/route.ts`, `app/api/aluno/entrar/route.ts`, `app/api/aluno/sair/route.ts`, `app/api/aluno/escolher/route.ts`, `app/api/aluno/link/route.ts`, `app/aluno/(area)/layout.tsx`, `app/aluno/(area)/page.tsx` (stub: `PageHeader` with the greeting only; Task 6 completes it), `tests/helpers/aluno.ts`
- Modify: `app/aluno/[token]/page.tsx` (rewrite as the confirm page), `proxy.ts`, `lib/tokens.ts`, `lib/tokens-db.ts`, `lib/bot/perfil.ts`, `app/api/painel/alunos/[id]/perfil-link/route.ts`, `tests/unit/tokens.test.ts`, `tests/e2e/perfil.test.ts`
- Test: `tests/e2e/aluno-entrar.test.ts`

**Interfaces:**
- Consumes: Task 3 (`emitirCodigo`, `verificarCodigo`, `criarSessao`, `lerSessao`, `trocarAluno`, `terminarSessao`, `requireAluno`, `sessaoAluno`, `alunoOu401`, cookie constants, `opcoesCookie`); Task 4 (`AppShell`, `ui`); `normalizarTelefone` from `lib/inscricao/validar.ts`; `permitido`, `ipDe`; `botEnabled` from `lib/bot/state.ts`; `alunosDoTelefone`, `alunoPublicoPorId`; `sendOutbound`; `verificarToken`; `saudacao` (Task 1); `primeiroNome`; `paginaAviso`.
- Produces:
  - `POST /api/aluno/codigo` (form field `telefone`): `!supabaseConfigured()` → 503; `normalizarTelefone` empty → 303 `/aluno/entrar?erro=telefone`; `permitido("codigo-ip", ip, 10, 900)`, `permitido("codigo-telefone", phone, 3, 3600)` or `permitido("codigo-global", "academia", 30, 86400)` false → 303 `/aluno/entrar?erro=limite`; `!(await botEnabled())` → 303 `/aluno/entrar?erro=bot`; `sessaoEmBaixo()` (row in `dlbjj_sessao` with `estado = 'caido'`, or `visto_em` older than 10 minutes; no row → false) → 303 `/aluno/entrar?erro=sessao`; if `alunosDoTelefone(phone)` non-empty → `emitirCodigo` + `sendOutbound({ leadId: null, to: phone, role: "bot", kind: "sistema", body: "O teu código para entrar na área de aluno DL-BJJ é *123456*. Vale 10 minutos. Se não pediste este código, ignora esta mensagem." })`; always (known or not) set cookie `dlbjj_entrar=<phone>` (`opcoesCookie(600)`) and 303 `/aluno/entrar?passo=codigo`.
  - `POST /api/aluno/entrar` (field `codigo`): no `dlbjj_entrar` cookie → 303 `/aluno/entrar`; `verificarCodigo`: `"ok"` → `criarSessao(phone, alunosDoTelefone(phone)[0].id)`, set `dlbjj_aluno` (`opcoesCookie(90*86400)`), delete `dlbjj_entrar`, 303 `/aluno`; `"errado"` → 303 `/aluno/entrar?passo=codigo&erro=codigo`; `"bloqueado"` → `?passo=codigo&erro=bloqueado`; `"nenhum"` → `?passo=codigo&erro=codigo`. 503 without Supabase.
  - `POST /api/aluno/sair`: `terminarSessao(cookie)`, delete cookie, 303 `/aluno/entrar`.
  - `POST /api/aluno/escolher` (field `aluno_id`): `alunoOu401()`; `trocarAluno(token, aluno_id)`; 303 `/aluno` either way.
  - `GET /aluno/[token]` (page, no shell, same frame as `/aluno/entrar`): `verificarToken(token, "perfil")`; not ok → `notFound()` (defence; the proxy normally rewrites to 410/404 first); ok → "Entrar como {primeiroNome(aluno.nome)}" + `<form method="post" action="/api/aluno/link"><input type="hidden" name="token"><button>Entrar</button></form>`. Nothing is consumed on GET.
  - `POST /api/aluno/link` (field `token`): `reclamarTokenPerfil(token)` (new in `lib/tokens-db.ts`: same atomic conditional UPDATE as `reclamarTokenInscricao`, `kind = 'perfil'`) → null → 303 `/aluno/entrar?erro=link`; row → `criarSessao(aluno.phone, row.aluno_id)`, set cookie, 303 `/aluno`.
  - `/aluno/entrar` page (no shell; centred on `bg-app-page`, wordmark, card): `?passo=codigo` shows the code form and "Se este número tiver ficha de aluno, vais receber um código no WhatsApp."; errors: `telefone` → "Número inválido. Usa o telemóvel com que te inscreveste."; `limite` → "Demasiados pedidos. Tenta mais tarde."; `bot` → "O envio de códigos está desligado de momento. Fala com a academia."; `codigo` → "Código errado ou expirado."; `bloqueado` → "Demasiadas tentativas. Pede um código novo." (with a link back to step 1); `sessao` → "O WhatsApp da academia está em baixo de momento. Tenta mais tarde."; `link` → "Este link já foi usado ou expirou. Pede um novo com *perfil* no WhatsApp ou entra com o teu número.". Fields: `telefone` (`type="tel"`, `inputMode="tel"`, autofocus) / `codigo` (`inputMode="numeric"`, `maxLength={6}`, autofocus). Buttons "Enviar código" / "Entrar".
  - `app/aluno/(area)/layout.tsx`: `const ctx = await requireAluno()`; `AppShell` with `nav = [{ items: [Início /aluno exact] }, { caption: "TREINO", items: [Histórico /aluno/historico, Ranking /aluno/ranking, Calendário /aluno/calendario] }]`, `rodape = [{ href: "https://wa.me/351925797266", label: "WhatsApp da academia", icone: "whatsapp" }]`, `utilizador = { nome: ctx.aluno.nome, iniciais, menu: <sibling forms posting to /api/aluno/escolher> + <form method="post" action="/api/aluno/sair"><button>Sair</button></form> }`; no `sino` (students have no bell, §10); `metadata.robots = { index: false, follow: false }`; `export const dynamic = "force-dynamic"`.
  - `lib/tokens.ts`: `avaliarToken` returns `{ ok: false, motivo: "usado" }` for any kind with `usado_em` (perfil becomes single-use).
  - `lib/bot/perfil.ts` texts: link → ``Aqui tens o link para entrares na tua área de aluno, ${primeiroNome}: ${APP.baseUrl()}/aluno/${token} (vale 7 dias)``; 4th request → ``Já te enviei 3 links hoje. Podes entrar em ${APP.baseUrl()}/aluno/entrar com o teu número. 🙂``. Same link text in `perfil-link/route.ts`.
  - `proxy.ts`: keep the matcher; inside `proxy()`, when `m[1] === "aluno"` and `!/^[A-Za-z0-9_-]{20,}$/.test(m[2])` return `NextResponse.next()` (so `/aluno/entrar`, `/aluno/historico`, … are never treated as tokens and never rate-limited as such).
  - `tests/helpers/aluno.ts`: `cookieDe(r: Response, nome: string): string` (from `r.headers.getSetCookie()`, returns `nome=valor`), `sessaoDe(alunoId: string, phone: string): Promise<string>` (inserts a `dlbjj_sessoes_aluno` row with a random token, returns `dlbjj_aluno=<token>`), `getAluno(path: string, cookie?: string)` (`redirect: "manual"`), `postAluno(path: string, campos: Record<string, string>, cookie?: string)` (urlencoded, `redirect: "manual"`), `pedirCodigo(telefone: string)` → `{ r: Response; entrar: string }`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/tokens.test.ts`:
```ts
it("um token de perfil usado deixa de servir", () => {
  const row = { token_hash: "h", kind: "perfil" as const, lead_id: null, aluno_id: "a", expira_em: new Date(Date.now() + 86_400_000).toISOString(), usado_em: new Date().toISOString(), revogado_em: null };
  expect(avaliarToken(row, "perfil")).toEqual({ ok: false, motivo: "usado" });
});
```

`tests/e2e/aluno-entrar.test.ts`:
```ts
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { E2E_URL, filaDe } from "../helpers/app";
import { cookieDe, getAluno, pedirCodigo, postAluno, sessaoDe } from "../helpers/aluno";
const sb = db();
beforeAll(() => { resetDb(); });
beforeEach(async () => { await sb.from("dlbjj_limites").delete().like("chave", "codigo-ip:%"); });
const codigoDe = (corpo: string) => corpo.match(/\*(\d{6})\*/)![1];

describe("Entrar na área de aluno (design §5.1)", () => {
  it("pede o código, recebe-o na fila como 'sistema' e entra", async () => {
    const { ana } = FIXTURES.alunos;
    const { r, entrar } = await pedirCodigo("920000001"); // normaliza o telemóvel
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toContain("/aluno/entrar?passo=codigo");
    const fila = await filaDe(sb, ana.phone);
    expect(fila.at(-1)!.kind).toBe("sistema");
    expect(fila.at(-1)!.corpo).toContain("Vale 10 minutos");
    const r2 = await postAluno("/api/aluno/entrar", { codigo: codigoDe(fila.at(-1)!.corpo) }, entrar);
    expect(r2.status).toBe(303);
    expect(r2.headers.get("location")).toMatch(/\/aluno$/);
    const sessao = cookieDe(r2, "dlbjj_aluno");
    const html = await (await getAluno("/aluno", sessao)).text();
    expect(html).toContain("Ana 👋");
    expect(html).toContain('id="sidebar"');
    expect(html).not.toContain(ana.phone);
    const saiu = await postAluno("/api/aluno/sair", {}, sessao);
    expect(saiu.status).toBe(303);
    expect((await getAluno("/aluno", sessao)).status).toBe(307);
  });
  it("sem sessão, /aluno manda para /aluno/entrar", async () => {
    const r = await getAluno("/aluno");
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toContain("/aluno/entrar");
  });
  it("número desconhecido: mesma resposta, nada na fila", async () => {
    const { r } = await pedirCodigo("351999999999");
    expect(r.headers.get("location")).toContain("passo=codigo");
    expect(await filaDe(sb, "351999999999")).toHaveLength(0);
  });
  it("cinco códigos errados bloqueiam; o certo já não entra", async () => {
    const { rui } = FIXTURES.alunos;
    const { entrar } = await pedirCodigo(rui.phone);
    for (let i = 0; i < 4; i++) expect((await postAluno("/api/aluno/entrar", { codigo: "000000" }, entrar)).headers.get("location")).toContain("erro=codigo");
    expect((await postAluno("/api/aluno/entrar", { codigo: "000000" }, entrar)).headers.get("location")).toContain("erro=bloqueado");
    const certo = codigoDe((await filaDe(sb, rui.phone)).at(-1)!.corpo);
    expect((await postAluno("/api/aluno/entrar", { codigo: certo }, entrar)).headers.get("location")).toContain("erro=bloqueado");
  });
  it("três códigos por telemóvel por hora", async () => {
    for (let i = 0; i < 3; i++) expect((await pedirCodigo("351999999998")).r.headers.get("location")).toContain("passo=codigo");
    expect((await pedirCodigo("351999999998")).r.headers.get("location")).toContain("erro=limite");
  });
  it("com a sessão do WhatsApp em baixo não sai código", async () => {
    await sb.from("dlbjj_sessao").upsert({ id: 1, estado: "caido", visto_em: new Date().toISOString() }, { onConflict: "id" });
    const { r } = await pedirCodigo(FIXTURES.alunos.joao.phone);
    expect(r.headers.get("location")).toContain("erro=sessao");
    expect(await filaDe(sb, FIXTURES.alunos.joao.phone)).toHaveLength(0);
    await sb.from("dlbjj_sessao").delete().eq("id", 1);
  });
  it("com o bot desligado não sai código", async () => {
    await sb.from("dlbjj_settings").upsert({ key: "bot_enabled", value: "off" }, { onConflict: "key" });
    const { r } = await pedirCodigo(FIXTURES.alunos.joao.phone);
    expect(r.headers.get("location")).toContain("erro=bot");
    expect(await filaDe(sb, FIXTURES.alunos.joao.phone)).toHaveLength(0);
    await sb.from("dlbjj_settings").upsert({ key: "bot_enabled", value: "on" }, { onConflict: "key" });
  });
  it("irmãos: troca de aluno só dentro do mesmo telemóvel", async () => {
    const { joao, ines, ana } = FIXTURES.alunos;
    const sessao = await sessaoDe(joao.id, joao.phone);
    expect(await (await getAluno("/aluno", sessao)).text()).toContain("João 👋");
    await postAluno("/api/aluno/escolher", { aluno_id: ana.id }, sessao);
    expect(await (await getAluno("/aluno", sessao)).text()).toContain("João 👋");
    await postAluno("/api/aluno/escolher", { aluno_id: ines.id }, sessao);
    expect(await (await getAluno("/aluno", sessao)).text()).toContain("Inês 👋");
  });
  it("ex-aluno perde a sessão", async () => {
    const { rui } = FIXTURES.alunos;
    const sessao = await sessaoDe(rui.id, rui.phone);
    expect((await getAluno("/aluno", sessao)).status).toBe(200);
    await sb.from("dlbjj_alunos").update({ estado: "ex_aluno" }).eq("id", rui.id);
    expect((await getAluno("/aluno", sessao)).status).toBe(307);
    await sb.from("dlbjj_alunos").update({ estado: "ativo" }).eq("id", rui.id);
  });
  it("a página de entrar renderiza sem sessão", async () => {
    const html = await (await fetch(`${E2E_URL}/aluno/entrar`)).text();
    expect(html).toContain("Enviar código");
    expect(html).not.toContain('id="sidebar"');
  });
});
```

Update `tests/e2e/perfil.test.ts`:
- first test: `corpo` contains `"Aqui tens o link para entrares na tua área de aluno, Rui:"` and `"(vale 7 dias)"`; `GET url` → 200 containing `"Entrar como Rui"` and `name="token"`; a second GET still 200 (nothing consumed); `postAluno("/api/aluno/link", { token })` → 303 to `/aluno` with `cookieDe(r, "dlbjj_aluno")`; `getAluno("/aluno", cookie)` → 200 html contains `"Rui 👋"` and `"Branca"`; a second `postAluno("/api/aluno/link", { token })` → 303 with `erro=link`; now `GET url` → 410 with "Este link expirou".
- sibling test: after "1", GET + POST the link the same way and assert `"João 👋"`, `not.toContain("asma")`, `not.toContain("Marta")`.
- fourth-request test: last corpo `toContain("Já te enviei 3 links hoje")`, and `toContain("/aluno/entrar")`.
- the 410/404 tests stay as they are.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/tokens.test.ts; VITEST_E2E=1 npx vitest run tests/e2e/aluno-entrar.test.ts tests/e2e/perfil.test.ts`
Expected: unit FAIL (`ok: true` for the used perfil token); e2e FAIL — cannot resolve `../helpers/aluno`, 404s on `/api/aluno/codigo`, the old ficha page instead of "Entrar como Rui".

- [ ] **Step 3: Implement routes, pages, layout, helper, proxy guard, token rule and texts**

Read the Next docs on route handlers and cookies first (Global Constraints). Route handlers: `export const runtime = "nodejs"`; build the redirect with `NextResponse.redirect(new URL(path, req.url), 303)` and set cookies on that response. The `(area)` layout must not wrap `/aluno/entrar` or `/aluno/[token]` (route group). `sessaoEmBaixo()` lives in `lib/aluno/codigos.ts`.

- [ ] **Step 4: Run the tests**

Run: `npm run test:unit && VITEST_E2E=1 npx vitest run tests/e2e/aluno-entrar.test.ts tests/e2e/perfil.test.ts tests/e2e/painel-alunos.test.ts`
Expected: PASS (painel-alunos still green: the perfil-link POST only changed its text).

- [ ] **Step 5: Commit**

```bash
git add app/aluno app/api/aluno proxy.ts lib/tokens.ts lib/tokens-db.ts lib/bot/perfil.ts lib/aluno/codigos.ts "app/api/painel/alunos/[id]/perfil-link/route.ts" tests/helpers/aluno.ts tests/unit/tokens.test.ts tests/e2e/aluno-entrar.test.ts tests/e2e/perfil.test.ts
git commit -m "Entrar na área de aluno: telemóvel + código pelo WhatsApp, sessão de 90 dias, irmãos, sair; o link 'perfil' confirma e é de uso único"
```

---

### Task 6: Início do aluno

**Files:**
- Create: `lib/aluno/dados.ts`
- Modify: `app/aluno/(area)/page.tsx`
- Test: `tests/e2e/aluno-inicio.test.ts`

**Interfaces:**
- Consumes: Task 1 functions; Task 4 `StatCard`, `Faixa`, `PageHeader`, `SectionTitle`, `Card`, `Button`; `faixaAtualDe`, `turmasAtivas`, `alunoPublicoPorId`; `rankingAulas` from `lib/alunos/aulas.ts`; `descreverFaixa`; `mesAno`, `diaMes`; `localPorSlug`.
- Produces (`lib/aluno/dados.ts`, server-only, explicit selects):
  - `interface PresencaAluno { data: string; turma_id: string; dlbjj_turmas: { turma: string; horario: string; local_slug: string } | null }`
  - `presencasDoAluno(alunoId: string, desde?: string): Promise<PresencaAluno[]>` (desc by `data`)
  - `contagensPorAluno(desde: string | null): Promise<{ alunoId: string; n: number }[]>` — one entry per `estado = 'ativo'` and `ranking_visivel = true` student (0 when none), presences with `data >= desde` when given
  - `rankingAlunos(periodo: "mes" | "sempre", hoje: string): Promise<LinhaRankingAluno[]>` — active, `ranking_visivel` students with `nome`, current `faixa` (via `faixaAtual` over one `dlbjj_graduacoes` query), `n` (unsorted; `ordenarRanking` sorts)
  - `interface NumerosAcademia { aulasSemana: number; presencasMes: number; alunosAtivos: number; turmaTop: LinhaRanking | null; presencasRecentes: PresencaDia[] }`
  - `numerosAcademia(hoje: string): Promise<NumerosAcademia>` — `presencasRecentes` = academy-wide presences with `data >= somarDias(hoje, -91)` (for the heatmaps); `turmaTop` = `rankingAulas(30)[0]` when it has presences
- Início page (§5.2): `PageHeader` "{saudacao} , {primeiroNome} 👋" with `<Button href="/aluno/calendario" variant="outline"><Icone nome="calendario" /> Aulas de hoje</Button>`; belt card (`Faixa` + "Faixa {FAIXA_LABEL}" + " · N grau(s)" when `graus > 0`, or "Ainda sem faixa registada" when null; "👤 Membro desde {mesAno(inicio_em)}" or "—"; "🥋 Última aula: {descreverUltimaAula}" or "🥋 Ainda sem presenças"); 4 `StatCard`s in `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`: `icone="presencas"` `aulasNoMes` "Aulas este mês" (href `/aluno/historico`), `icone="historico"` `aulasDesdeInicio` "Aulas desde o início" sub `desde {mesAno}` , `icone="turma"` `diasSeguidos` "Dias seguidos", `icone="ranking"` `"{posicao}.º"` (or "—" when `posicao` is null, i.e. hidden from the ranking) "Posição no ranking" sub `de {total} este mês` (href `/aluno/ranking`); `mapa` = `mapaDeCalor(presencas, hoje, 12)` on every student card; `SectionTitle emoji="🏛"` "A minha academia" + 4 cards `grid gap-4 md:grid-cols-2`: `aulasSemana` "Aulas esta semana", `presencasMes` "Presenças este mês", `alunosAtivos` "Alunos ativos", `turmaTop` as "{turma} · {dias} {horario} · {local}" (or "—") "Turma mais concorrida", `mapa` = `mapaDeCalor(presencasRecentes, hoje, 12)`; footer "Para marcar presença escreve *presente* no WhatsApp da academia." as `<p className="text-sm text-app-muted">` with `<strong>presente</strong>`.

- [ ] **Step 1: Write the failing test** — `tests/e2e/aluno-inicio.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { getAluno, sessaoDe } from "../helpers/aluno";
import { hojeLisboa } from "@/lib/tempo";
const sb = db();
beforeAll(() => { resetDb(); });

describe("Início do aluno (design §5.2)", () => {
  it("mostra faixa, membro desde, última aula, os quatro números e a academia", async () => {
    const { ana } = FIXTURES.alunos;
    const html = await (await getAluno("/aluno", await sessaoDe(ana.id, ana.phone))).text();
    expect(html).toContain("Ana 👋");
    expect(html).toContain("Faixa Azul · 1 grau");
    expect(html).toContain("Membro desde fevereiro de 2024");
    expect(html).toContain("Última aula:");
    const { count } = await sb.from("dlbjj_presencas").select("*", { count: "exact", head: true }).eq("aluno_id", ana.id).gte("data", `${hojeLisboa().slice(0, 7)}-01`);
    expect(html).toMatch(new RegExp(`>${count}<[\\s\\S]{0,200}Aulas este mês`));
    expect(html).toMatch(/>18<[\s\S]{0,200}Aulas desde o início/);
    for (const t of ["Dias seguidos", "Posição no ranking", "de 4 este mês", "A minha academia", "Aulas esta semana", "Presenças este mês", "Alunos ativos", "Turma mais concorrida", "Aulas de hoje"]) expect(html, t).toContain(t);
    expect(html).toMatch(/>4<[\s\S]{0,200}Alunos ativos/);
    expect(html).toContain('title="'); // células do mapa de calor
    expect(html).not.toContain(ana.phone);
    expect(html).not.toContain("ana@example.com");
  });
  it("aluna sem presenças: zeros e sem última aula", async () => {
    const { ines } = FIXTURES.alunos;
    await sb.from("dlbjj_presencas").delete().eq("aluno_id", ines.id);
    const html = await (await getAluno("/aluno", await sessaoDe(ines.id, ines.phone))).text();
    expect(html).toContain("Ainda sem presenças");
    expect(html).toMatch(/>0<[\s\S]{0,200}Aulas este mês/);
    expect(html).toContain("4.º");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `VITEST_E2E=1 npx vitest run tests/e2e/aluno-inicio.test.ts`
Expected: FAIL — "Faixa Azul · 1 grau" not found (stub page).

- [ ] **Step 3: Implement `lib/aluno/dados.ts` and the page**

`diasComAula` for `diasSeguidos` = union of `dias_semana` over `turmasDoAluno(aluno, turmasAtivas)`. All queries in one `Promise.all`.

- [ ] **Step 4: Run the tests**

Run: `VITEST_E2E=1 npx vitest run tests/e2e/aluno-inicio.test.ts tests/e2e/aluno-entrar.test.ts && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Look at it** — dev server on 3005, log in as Ana (`/aluno/entrar` with 920000001; read the code from `dlbjj_fila_saida` via `supabase` SQL or the painel Agente page… simplest: `psql`-free: `curl -X POST localhost:3005/api/aluno/codigo -d telefone=920000001 -i` then `npx tsx -e` with the service client to print the last queue row for 351920000001). Compare `/aluno` with the reference at 1440px and 375px: greeting + outline button, belt card with the SVG belt, four cards with the heatmap at the right edge, "🏛 A minha academia" with two columns. Fix spacing until it matches §4.

- [ ] **Step 6: Commit**

```bash
git add lib/aluno/dados.ts "app/aluno/(area)/page.tsx" tests/e2e/aluno-inicio.test.ts
git commit -m "Início do aluno: faixa, membro desde, última aula, aulas no mês e desde o início, dias seguidos, posição, a minha academia"
```

---

### Task 7: Histórico and Ranking

**Files:**
- Create: `app/aluno/(area)/historico/page.tsx`, `app/aluno/(area)/ranking/page.tsx`, `app/api/painel/alunos/[id]/ranking/route.ts`
- Modify: `app/painel/alunos/[id]/page.tsx` (one form: checkbox "Aparece no ranking")
- Test: `tests/e2e/aluno-paginas.test.ts`

**Interfaces:**
- Consumes: `presencasDoAluno`, `rankingAlunos` (Task 6); `ordenarRanking`, `mapaDeCalor`, `posicaoNoRanking` (Task 1); `mesAno`, `diaCurto`; `MapaDeCalor`, `Faixa`, `Pill`, `PageHeader`, `Card`; `localPorSlug`.
- Produces (§5.3): `/aluno/historico` — `PageHeader` "Histórico"; `Card` with `MapaDeCalor(mapaDeCalor(presencas, hoje, 26))` and caption "Últimos 6 meses"; presences from `?desde=YYYY-MM` (default 12 months back) grouped by month desc, heading `{mesAno} · {n} aulas` (singular "1 aula"), rows `{diaCurto} · {horario HH:MM} · {turma} · {local nome}`; link "Ver mais antigas" → `?desde=<12 months before current desde>` when the oldest loaded month still had rows; empty → "Ainda não tens presenças. Escreve <strong>presente</strong> no WhatsApp quando chegares à aula."
- Produces (§5.4): `/aluno/ranking` — `PageHeader` "Ranking"; tabs `?periodo=mes` (default, "Este mês") / `?periodo=sempre` ("Desde sempre"); line "Estás em {posicao}.º de {total}"; list rows `<li data-eu>` for the logged-in student (`bg-app-soft`, `id="eu"`, and the page includes `<script>document.getElementById("eu")?.scrollIntoView({block:"center"})</script>` only below `lg:` via a client component or a plain inline script — builder's choice), each row: position, `nomeCurto`, belt `Pill` with "{FAIXA_LABEL} · N grau(s)" or "Sem faixa", "{n} aulas"/"1 aula". Zero-presence students at the end. A hidden student (`ranking_visivel = false`) sees "Não apareces no ranking." instead of the "Estás em…" line and no `data-eu` row.
- Produces: `POST /api/painel/alunos/[id]/ranking` (field `visivel` = `"1"` or absent): `sessaoOu401`; updates `ranking_visivel`; `voltar("/painel/alunos/<id>", { ok: "1" })`. The painel student page shows `<form method="post" action="/api/painel/alunos/<id>/ranking"><label><input type="checkbox" name="visivel" value="1" checked?> Aparece no ranking</label><button>Guardar</button></form>`.

- [ ] **Step 1: Write the failing test** — `tests/e2e/aluno-paginas.test.ts` (Task 8 appends the calendar block):

```ts
import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { getAluno, sessaoDe } from "../helpers/aluno";
const sb = db();
let ana: string, ines: string;
beforeAll(async () => {
  resetDb();
  ana = await sessaoDe(FIXTURES.alunos.ana.id, FIXTURES.alunos.ana.phone);
  ines = await sessaoDe(FIXTURES.alunos.ines.id, FIXTURES.alunos.ines.phone);
});

describe("Histórico (design §5.3)", () => {
  it("agrupa por mês, mostra hora, turma e local, e o mapa de 6 meses", async () => {
    const html = await (await getAluno("/aluno/historico", ana)).text();
    expect(html).toContain("Últimos 6 meses");
    expect(html).toMatch(/ de 20\d\d · \d+ aulas?/);
    expect(html).toContain("19:30 · Jiu-Jitsu · São Brás");
    expect(html).not.toContain("Rui");
  });
  it("sem presenças explica como marcar", async () => {
    await sb.from("dlbjj_presencas").delete().eq("aluno_id", FIXTURES.alunos.ines.id);
    const html = await (await getAluno("/aluno/historico", ines)).text();
    expect(html).toContain("Ainda não tens presenças");
  });
});

describe("Ranking (design §5.4)", () => {
  it("primeiros nomes, faixas, posição da aluna e quem tem 0 no fim", async () => {
    const html = await (await getAluno("/aluno/ranking?periodo=sempre", ana)).text();
    expect(html).toMatch(/Estás em \d\.º de 4/);
    for (const n of ["Ana", "Rui", "João", "Inês"]) expect(html, n).toContain(n);
    expect(html).not.toContain("Silva");
    expect(html).not.toContain("Pereira");
    expect(html).toContain("data-eu");
    expect(html).toContain("Azul · 1 grau");
    expect(html.lastIndexOf("Inês")).toBeGreaterThan(html.lastIndexOf("João")); // Inês ficou sem presenças
    expect(html).toContain("0 aulas");
  });
  it("este mês é o separador por omissão", async () => {
    const html = await (await getAluno("/aluno/ranking", ana)).text();
    expect(html).toContain("Este mês");
    expect(html).toContain("Desde sempre");
  });
  it("o Daniel pode esconder um aluno do ranking", async () => {
    const { postPainel } = await import("../helpers/painel");
    const r = await postPainel(`/api/painel/alunos/${FIXTURES.alunos.ines.id}/ranking`, {});
    expect(r.status).toBe(303);
    let html = await (await getAluno("/aluno/ranking?periodo=sempre", ana)).text();
    expect(html).not.toContain("Inês");
    expect(html).toMatch(/Estás em \d\.º de 3/);
    html = await (await getAluno("/aluno/ranking", ines)).text();
    expect(html).toContain("Não apareces no ranking.");
    expect(await (await getAluno("/aluno", ines)).text()).toMatch(/>—<[\s\S]{0,200}Posição no ranking/);
    await postPainel(`/api/painel/alunos/${FIXTURES.alunos.ines.id}/ranking`, { visivel: "1" });
    expect(await (await getAluno("/aluno/ranking?periodo=sempre", ana)).text()).toContain("Inês");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `VITEST_E2E=1 npx vitest run tests/e2e/aluno-paginas.test.ts`
Expected: FAIL — 404 on `/aluno/historico` and `/aluno/ranking`.

- [ ] **Step 3: Implement both pages**

- [ ] **Step 4: Run the tests**

Run: `VITEST_E2E=1 npx vitest run tests/e2e/aluno-paginas.test.ts && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/aluno/(area)/historico" "app/aluno/(area)/ranking" "app/api/painel/alunos/[id]/ranking" "app/painel/alunos/[id]/page.tsx" tests/e2e/aluno-paginas.test.ts
git commit -m "Histórico e Ranking do aluno; o Daniel pode esconder um aluno do ranking"
```

---

### Task 8: Events (painel) and the student Calendário

**Files:**
- Create: `lib/eventos.ts`, `app/painel/eventos/page.tsx`, `app/api/painel/eventos/route.ts`, `app/api/painel/eventos/[id]/route.ts`, `app/api/painel/eventos/[id]/cancelar/route.ts`, `app/aluno/(area)/calendario/page.tsx`
- Test: `tests/unit/eventos-validar.test.ts`, `tests/integration/eventos.test.ts`, `tests/e2e/painel-eventos.test.ts`, append to `tests/e2e/aluno-paginas.test.ts`

**Interfaces:**
- Consumes: `sessaoOu401`, `voltar`, `campos` from `lib/painel/guard.ts`; `mesDeCalendario`, `mesValido`, `mesAnterior`, `mesSeguinte`, `EventoCalendario` (Task 1); `turmasDoAluno`, `turmasAtivas`, `presencasDoAluno`; `locais` from `content/site.ts`; `MESES`, `diaCurto`.
- Produces (`lib/eventos.ts`):
  - pure: `interface DadosEvento { titulo: string; descricao: string | null; dia: string; hora: string | null; local_slug: string | null }`; `validarEvento(c: Record<string, string>): { ok: true; dados: DadosEvento } | { ok: false; erro: string }` — titulo trimmed 2–80 ("Título obrigatório (até 80 caracteres)"), dia `^\d{4}-\d{2}-\d{2}$` and a real date ("Dia inválido"), hora `""` or `^\d{2}:\d{2}$` ("Hora inválida"), local_slug `""` → null or one of the `locais` slugs ("Espaço desconhecido"), descricao ≤ 500 ("Descrição até 500 caracteres") → null when empty.
  - server-only: `interface Evento extends EventoCalendario { descricao: string | null; cancelado_em: string | null }`; `listarEventos(desde: string, ate: string): Promise<Evento[]>` (non-cancelled, `dia` between, asc by dia, hora); `proximosEventos(hoje: string, n: number): Promise<Evento[]>`; `eventosDoPainel(hoje: string): Promise<{ proximos: Evento[]; passados: Evento[] }>` (passados = last 90 days, desc; both include cancelled with `cancelado_em` set so Daniel sees them struck through); `criarEvento(d: DadosEvento): Promise<string>`; `editarEvento(id: string, d: DadosEvento): Promise<void>`; `cancelarEvento(id: string): Promise<void>`; `eventoPorId(id: string): Promise<Evento | null>`.
- Routes: `POST /api/painel/eventos` → `sessaoOu401`; invalid → `voltar("/painel/eventos", { erro })`; ok → `criarEvento` → `voltar("/painel/eventos", { ok: "1" })`. `POST /api/painel/eventos/[id]` → same with `editarEvento` (unknown id → `erro: "Evento não encontrado"`). `POST /api/painel/eventos/[id]/cancelar` → `cancelarEvento` → `voltar("/painel/eventos", { ok: "1" })`.
- Painel page (§6): `PageHeader` "Eventos"; `?ok=1` → "Guardado."; `?erro=` → red line; form (prefilled from `eventoPorId(sp.editar)` when `?editar=<id>`, posting to `/api/painel/eventos/<id>`; else posting to `/api/painel/eventos`): `titulo`, `dia` (`type="date"`), `hora` (`type="time"`), `local_slug` select ("Toda a academia", Queluz, São Brás, Kids Amadora), `descricao` textarea, button "Guardar"; two `Tabela`s "Próximos" and "Passados (90 dias)" with `diaCurto`, hora, título, local ("Toda a academia" when null), and per row "Editar" link + "Cancelar" form (hidden for already cancelled, which are shown with `line-through` and "cancelado").
- Student page (§5.5): `?mes=` via `mesValido`; `PageHeader` "Calendário" with `‹ {MESES[m-1]}` / `{MESES} ›` links and "Hoje" link to `/aluno/calendario`; title "{MESES[m]} de {yyyy}"; grid `hidden lg:grid grid-cols-7` with the cells from `mesDeCalendario(mes, turmasDoAluno(aluno, turmas), listarEventos(primeiro, último), presencasDoAluno(aluno.id, primeiro), hoje)`; cell: number (`text-app-accent font-bold` when `hoje`), class chips "{horario} {turma}", event chips `border border-app-accent text-app-accent` with the title, a 6px dot when `presente`; below `lg:` the same month as a list of days (one row per day that has aulas, eventos or presente, plus today); "Próximos eventos" list from `proximosEventos(hoje, 10)`: "{diaCurto} · {hora ?? "—"} · {titulo} · {local nome | Toda a academia}", empty → "Sem eventos marcados."

- [ ] **Step 1: Write the failing tests**

`tests/unit/eventos-validar.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { validarEvento } from "@/lib/eventos";
describe("validarEvento", () => {
  it("aceita o mínimo e normaliza vazios para null", () => {
    expect(validarEvento({ titulo: " Seminário ", dia: "2026-11-08", hora: "", local_slug: "", descricao: "" })).toEqual({ ok: true, dados: { titulo: "Seminário", dia: "2026-11-08", hora: null, local_slug: null, descricao: null } });
  });
  it("recusa título curto, dia e hora inválidos, espaço desconhecido, descrição longa", () => {
    expect(validarEvento({ titulo: "A", dia: "2026-11-08" })).toMatchObject({ ok: false, erro: "Título obrigatório (até 80 caracteres)" });
    expect(validarEvento({ titulo: "Seminário", dia: "2026-02-30" })).toMatchObject({ ok: false, erro: "Dia inválido" });
    expect(validarEvento({ titulo: "Seminário", dia: "2026-11-08", hora: "25:00" })).toMatchObject({ ok: false, erro: "Hora inválida" });
    expect(validarEvento({ titulo: "Seminário", dia: "2026-11-08", local_slug: "lisboa" })).toMatchObject({ ok: false, erro: "Espaço desconhecido" });
    expect(validarEvento({ titulo: "Seminário", dia: "2026-11-08", descricao: "x".repeat(501) })).toMatchObject({ ok: false, erro: "Descrição até 500 caracteres" });
  });
});
```

`tests/integration/eventos.test.ts`:
```ts
import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { cancelarEvento, criarEvento, editarEvento, eventosDoPainel, listarEventos, proximosEventos } from "@/lib/eventos";
import { hojeLisboa, somarDias } from "@/lib/tempo";
const sb = db();
beforeAll(() => { resetDb(); });
describe("eventos", () => {
  it("cria, lista por intervalo, edita, cancela (soft) e some das listas do aluno", async () => {
    const hoje = hojeLisboa();
    const id = await criarEvento({ titulo: "Open Mat", descricao: null, dia: somarDias(hoje, 3), hora: "11:00", local_slug: "sao-bras" });
    expect((await listarEventos(hoje, somarDias(hoje, 7))).map((e) => e.titulo)).toContain("Open Mat");
    await editarEvento(id, { titulo: "Open Mat NoGi", descricao: "Traz rashguard", dia: somarDias(hoje, 3), hora: null, local_slug: null });
    const { data } = await sb.from("dlbjj_eventos").select("titulo,hora,local_slug").eq("id", id).single();
    expect(data).toEqual({ titulo: "Open Mat NoGi", hora: null, local_slug: null });
    expect((await proximosEventos(hoje, 10)).map((e) => e.id)).toEqual(expect.arrayContaining([id, FIXTURES.eventos.seminario.id, FIXTURES.eventos.graduacao.id]));
    await cancelarEvento(id);
    expect((await proximosEventos(hoje, 10)).map((e) => e.id)).not.toContain(id);
    expect((await eventosDoPainel(hoje)).proximos.find((e) => e.id === id)?.cancelado_em).toBeTruthy();
  });
});
```

`tests/e2e/painel-eventos.test.ts`:
```ts
import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { getPainel, postPainel } from "../helpers/painel";
import { getAluno, sessaoDe } from "../helpers/aluno";
import { hojeLisboa, somarDias } from "@/lib/tempo";
const sb = db();
beforeAll(() => { resetDb(); });
describe("Painel — eventos (design §6)", () => {
  it("cria, mostra ao aluno, edita e cancela", async () => {
    const dia = somarDias(hojeLisboa(), 2);
    const r = await postPainel("/api/painel/eventos", { titulo: "Treino aberto", dia, hora: "19:00", local_slug: "sao-bras", descricao: "" });
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("/painel/eventos?ok=1");
    let html = await (await getPainel("/painel/eventos")).text();
    expect(html).toContain("Treino aberto");
    expect(html).toContain("Seminário de guarda com convidado");
    const ana = await sessaoDe(FIXTURES.alunos.ana.id, FIXTURES.alunos.ana.phone);
    expect(await (await getAluno("/aluno/calendario", ana)).text()).toContain("Treino aberto");
    const { data } = await sb.from("dlbjj_eventos").select("id").eq("titulo", "Treino aberto").single();
    await postPainel(`/api/painel/eventos/${data!.id}`, { titulo: "Treino aberto a todos", dia, hora: "19:00", local_slug: "", descricao: "" });
    expect(await (await getPainel(`/painel/eventos?editar=${data!.id}`)).text()).toContain('value="Treino aberto a todos"');
    await postPainel(`/api/painel/eventos/${data!.id}/cancelar`, {});
    html = await (await getPainel("/painel/eventos")).text();
    expect(html).toContain("cancelado");
    expect(await (await getAluno("/aluno/calendario", ana)).text()).not.toContain("Treino aberto");
  });
  it("título vazio volta com erro", async () => {
    const r = await postPainel("/api/painel/eventos", { titulo: "", dia: "2026-12-01" });
    expect(r.headers.get("location")).toContain("erro=");
  });
  it("sem sessão → 401", async () => {
    expect((await postPainel("/api/painel/eventos", { titulo: "x", dia: "2026-12-01" }, false)).status).toBe(401);
  });
});
```

Append to `tests/e2e/aluno-paginas.test.ts`:
```ts
describe("Calendário (design §5.5)", () => {
  it("mês atual, aula da aluna, eventos próximos com local, mês inválido cai no atual", async () => {
    const html = await (await getAluno("/aluno/calendario", ana)).text();
    expect(html).toContain("Calendário");
    expect(html).toContain("19:30 Jiu-Jitsu");
    expect(html).toContain("Próximos eventos");
    expect(html).toContain("Seminário de guarda com convidado · Queluz");
    expect(html).toContain("Graduação de fim de ano · Toda a academia");
    const mau = await (await getAluno("/aluno/calendario?mes=abc", ana)).text();
    expect(mau).toContain("19:30 Jiu-Jitsu");
    expect((await getAluno("/aluno/calendario?mes=2026-13", ana)).status).toBe(200);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/eventos-validar.test.ts tests/integration/eventos.test.ts; VITEST_E2E=1 npx vitest run tests/e2e/painel-eventos.test.ts tests/e2e/aluno-paginas.test.ts`
Expected: FAIL — cannot resolve `@/lib/eventos`; 404s.

- [ ] **Step 3: Implement `lib/eventos.ts`, the three routes, the painel page and the calendar page**

- [ ] **Step 4: Run the tests**

Run: `npm run test:unit && npm run test:integration && VITEST_E2E=1 npx vitest run tests/e2e/painel-eventos.test.ts tests/e2e/aluno-paginas.test.ts && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Look at it** — `/aluno/calendario` at 1440px (7-column grid, today in red, chips) and 375px (day list, no sideways scroll); `/painel/eventos` form and tables.

- [ ] **Step 6: Commit**

```bash
git add lib/eventos.ts app/painel/eventos app/api/painel/eventos "app/aluno/(area)/calendario" tests/unit/eventos-validar.test.ts tests/integration/eventos.test.ts tests/e2e/painel-eventos.test.ts tests/e2e/aluno-paginas.test.ts
git commit -m "Eventos no painel (criar, editar, cancelar) e Calendário do aluno com aulas, eventos e presenças"
```

---

### Task 9: Painel Início (dashboard), Mensagens move, conversations waiting

**Files:**
- Create: `lib/painel/mensagens.ts`, `lib/painel/dashboard.ts`, `app/painel/mensagens/page.tsx` (git mv from `app/painel/page.tsx`), `app/painel/mensagens/[phone]/page.tsx` (git mv from `app/painel/[phone]/page.tsx`), new `app/painel/page.tsx`
- Modify: `app/painel/actions.ts` (`refresh` → `/painel/mensagens/${phone}` and `/painel/mensagens`), `app/api/painel/leads/[phone]/perdido/route.ts` (`voltar` targets), `app/painel/layout.tsx` (badge + `sino`), `components/painel/lead-actions.tsx` (unchanged paths? only `/api/...` — verify), `tests/e2e/painel-leads.test.ts` (paths), any `href="/painel"` meant as the list → `/painel/mensagens`
- Test: `tests/integration/mensagens-espera.test.ts`, `tests/e2e/painel-inicio.test.ts`

**Interfaces:**
- Consumes: `StatCard`, `SectionTitle`, `Card`, `PageHeader`, `Button`; `timeAgo`; `numerosAcademia` (Task 6); `hojeLisboa`; `botEnabled`.
- Produces (`lib/painel/mensagens.ts`): `conversasAEspera(): Promise<{ total: number; phones: string[] }>` — leads with `paused = true or status = 'humano'` whose newest `dlbjj_mensagens` row **with `role in ('lead','humano')`** (by `created_at`) has `direction = 'in'`; `role = 'bot'` rows (codes, system messages) are ignored (§10).
- Produces (`lib/painel/dashboard.ts`): `interface NumerosPainel { alunosAtivos: number; alunosInativos: number; presencasMes: number; inscricoesMes: number; conversasAEspera: number; toquesPendentes: number; aulasSemana: number; turmaTop: LinhaRanking | null; presencasRecentes: PresencaDia[]; sessao: { estado: string; detalhe: string | null; visto_em: string } | null; botLigado: boolean; proativasHoje: number; tecto: number }`; `numerosDoPainel(hoje: string): Promise<NumerosPainel>` (`inscricoesMes` = `dlbjj_alunos.created_at >= first of month`; `toquesPendentes` = `dlbjj_toques.estado = 'na_fila'`; `tecto` = setting `proativas_por_dia`, default 10; `proativasHoje` from `dlbjj_orcamento_envio` for `hoje`).
- Dashboard page (§6 Início): `PageHeader` "{saudacao}, Daniel 👋" + `Button href="/painel/aulas" variant="outline"` "Aulas de hoje"; agent card (`Card` linking to `/painel/agente`): title "Agente de WhatsApp", lines "Sessão {ligada | instável | em baixo | — o worker ainda não reportou}" with "visto há …", "Interruptor {ligado|desligado}", "{n} conversas à espera", "Proativas hoje: {n} de {tecto}"; 4 `StatCard`s: `alunosAtivos` "Alunos ativos" → `/painel/alunos`, `presencasMes` "Presenças este mês" → `/painel/aulas`, `inscricoesMes` "Inscrições este mês" → `/painel/alunos`, `conversasAEspera` "Conversas à espera" → `/painel/mensagens`; `SectionTitle emoji="🏛"` "A minha academia": `aulasSemana` "Aulas esta semana", `turmaTop` "Turma mais concorrida (30 dias)", `alunosInativos` "Alunos inativos" → `/painel/reativacao`, `toquesPendentes` "Toques pendentes" → `/painel/reativacao`; every `mapa` = `mapaDeCalor(presencasRecentes, hoje, 12)`. `!supabaseConfigured()` → the existing "Falta configurar o Supabase" card.
- Layout: `badge` on Mensagens = `conversasAEspera().total` when > 0; `sino = { ativo: total > 0 || (sessao && sessao.estado !== "ligado"), href: total > 0 ? "/painel/mensagens" : "/painel/agente", titulo: … }`; both skipped when `!supabaseConfigured()`.
- `/painel/mensagens` and `/painel/mensagens/[phone]`: the moved pages, headers rebuilt with `PageHeader` "Mensagens" and the back link "← Mensagens"; behaviour and asserted strings unchanged ("telemóvel", "bot em pausa", `max-w-[80%]` bubbles, "Perdido", "Ver aluno").

- [ ] **Step 1: Write the failing tests**

`tests/integration/mensagens-espera.test.ts`:
```ts
import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { conversasAEspera } from "@/lib/painel/mensagens";
const sb = db();
beforeAll(() => { resetDb(); });
it("conta só as pausadas/humano cuja última mensagem é da pessoa", async () => {
  const { emProgresso, concluido } = FIXTURES.leads;
  expect((await conversasAEspera()).total).toBe(0);
  await sb.from("dlbjj_leads").update({ paused: true, status: "humano" }).eq("id", emProgresso.id);
  await sb.from("dlbjj_mensagens").insert({ lead_id: emProgresso.id, phone: emProgresso.phone, direction: "in", role: "lead", body: "Olá?" });
  expect(await conversasAEspera()).toEqual({ total: 1, phones: [emProgresso.phone] });
  await sb.from("dlbjj_mensagens").insert({ lead_id: emProgresso.id, phone: emProgresso.phone, direction: "out", role: "bot", body: "O teu código é *123456*" });
  expect((await conversasAEspera()).total).toBe(1); // um código não é o Daniel a responder
  await sb.from("dlbjj_mensagens").insert({ lead_id: emProgresso.id, phone: emProgresso.phone, direction: "out", role: "humano", body: "Olá!" });
  expect((await conversasAEspera()).total).toBe(0);
  await sb.from("dlbjj_mensagens").insert({ lead_id: concluido.id, phone: concluido.phone, direction: "in", role: "lead", body: "?" }); // não pausada → não conta
  expect((await conversasAEspera()).total).toBe(0);
});
```

`tests/e2e/painel-inicio.test.ts`:
```ts
import { beforeAll, describe, expect, it } from "vitest";
import { db, FIXTURES, resetDb } from "../helpers/db";
import { getPainel } from "../helpers/painel";
const sb = db();
beforeAll(() => { resetDb(); });
describe("Painel — Início (design §6)", () => {
  it("saudação, agente, números e academia", async () => {
    const html = await (await getPainel("/painel")).text();
    expect(html).toContain("Daniel 👋");
    expect(html).toContain("Agente de WhatsApp");
    expect(html).toContain("o worker ainda não reportou");
    expect(html).toMatch(/>4<[\s\S]{0,200}Alunos ativos/);
    for (const t of ["Presenças este mês", "Inscrições este mês", "Conversas à espera", "A minha academia", "Aulas esta semana", "Turma mais concorrida", "Alunos inativos", "Toques pendentes", "Proativas hoje: 0 de 10"]) expect(html, t).toContain(t);
  });
  it("conversa à espera aparece no número, no crachá e no sino", async () => {
    const { emProgresso } = FIXTURES.leads;
    await sb.from("dlbjj_leads").update({ paused: true, status: "humano" }).eq("id", emProgresso.id);
    await sb.from("dlbjj_mensagens").insert({ lead_id: emProgresso.id, phone: emProgresso.phone, direction: "in", role: "lead", body: "Olá?" });
    const html = await (await getPainel("/painel")).text();
    expect(html).toMatch(/>1<[\s\S]{0,200}Conversas à espera/);
    expect(html).toContain('data-badge="1"');
    expect(html).toContain('data-sino="ativo"');
  });
  it("as conversas vivem em /painel/mensagens", async () => {
    expect((await getPainel("/painel/mensagens?estado=concluido")).status).toBe(200);
    expect(await (await getPainel(`/painel/mensagens/${FIXTURES.leads.concluido.phone}`)).text()).toContain("Carla Teste");
  });
});
```

In `tests/e2e/painel-leads.test.ts` replace `"/painel?estado=…"`, `"/painel?q=…"`, `"/painel"` and `` `/painel/${phone}` `` with the `/painel/mensagens` equivalents.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/integration/mensagens-espera.test.ts; VITEST_E2E=1 npx vitest run tests/e2e/painel-inicio.test.ts tests/e2e/painel-leads.test.ts`
Expected: FAIL — cannot resolve `@/lib/painel/mensagens`; "Daniel 👋" missing; 404 on `/painel/mensagens`.

- [ ] **Step 3: Move the pages with `git mv`, implement the two libs, the dashboard, the layout badge/bell (`data-badge="{n}"` on the nav item, `data-sino="ativo"` on the bell link), fix every old path**

`grep -rn '"/painel"\|`/painel/\${' app components lib` must show only dashboard/home links afterwards.

- [ ] **Step 4: Run the tests**

Run: `npm run test:integration && npm run test:e2e && npm run lint && npm run typecheck`
Expected: PASS (whole e2e suite).

- [ ] **Step 5: Look at it** — `/painel` at 1440px next to the reference: same header row, the agent card where the belt card is, four cards, academy section.

- [ ] **Step 6: Commit**

```bash
git add -A app/painel lib/painel app/api/painel/leads tests/e2e/painel-leads.test.ts tests/e2e/painel-inicio.test.ts tests/integration/mensagens-espera.test.ts
git commit -m "Painel: Início com os números da academia e do agente; conversas em /painel/mensagens; conversas à espera no crachá e no sino"
```

---

### Task 10: Rebuild the remaining painel pages on the primitives

**Files:**
- Modify: `app/painel/alunos/page.tsx`, `app/painel/alunos/[id]/page.tsx`, `app/painel/alunos/novo/page.tsx`, `app/painel/aulas/page.tsx`, `app/painel/aulas/[turmaId]/page.tsx`, `app/painel/reativacao/page.tsx`, `app/painel/perguntar/page.tsx`, `app/painel/agente/page.tsx`, `app/painel/login/page.tsx`, `app/painel/mensagens/page.tsx`, `app/painel/mensagens/[phone]/page.tsx`, `components/painel/{alunos-ui,lead-actions,reply-box,thread-body}.tsx`, `lib/inscricao/formulario.ts` (only class names of the HTML-string form so `/inscricao/[token]` and `/painel/alunos/novo` match the tokens)

**Interfaces:**
- Consumes: everything in `components/app/ui.tsx`, `Pill`, `Tabela`, `PageHeader`.
- Produces: no new behaviour. Every page: `PageHeader` as h1; tables through `Tabela`; forms through `Input`/`Select`/`Textarea`/`Button`; badges through `Pill`; no `neutral-*` or `shadow-*` classes left under `app/painel` and `components/painel` (`grep -rn "neutral-\|shadow-" app/painel components/painel app/inscricao lib/inscricao/formulario.ts` → 0 lines). Keep every string the e2e suite asserts (see `tests/e2e/painel-*.test.ts`, `agente.test.ts`, `perguntar.test.ts`, `reativacao-painel.test.ts`, `inscricao.test.ts`), the `max-w-[80%]` bubble class, and every form field name.

This task changes presentation only; its gate is the existing suite plus the visual check. Record that in the ledger as a ruling (TDD exception for a restyle with no behaviour change).

- [ ] **Step 1: Restyle page by page**, running `VITEST_E2E=1 npx vitest run tests/e2e/<matching file>` after each page.

- [ ] **Step 2: Grep gate**

Run: `grep -rn "neutral-\|shadow-" app/painel components/painel app/inscricao lib/inscricao/formulario.ts | wc -l`
Expected: `0`.

- [ ] **Step 3: Whole suite**

Run: `npm run lint && npm run typecheck && npm run test:e2e`
Expected: PASS.

- [ ] **Step 4: Look at it** — every painel page and `/inscricao/<token>` at 1440px and 375px.

- [ ] **Step 5: Commit**

```bash
git add app/painel components/painel lib/inscricao/formulario.ts
git commit -m "Painel: todas as páginas sobre os mesmos cartões, tabelas, formulários e crachás"
```

---

### Task 11: Production check, docs, full verify, screenshots

**Files:**
- Modify: `tests/e2e/producao.test.ts`, `AGENTE-WHATSAPP.md` (§1 table: "perfil" row now says it sends the login link; new "Área do aluno" subsection: `/aluno/entrar`, code by WhatsApp, 90-day session, what a student can see; §7 map adds `lib/aluno/*`, `lib/eventos.ts`, `app/aluno/*`, `app/api/aluno/*`), `README.md` (one line on the student area and `/painel` dashboard), `docs/PRE-VOO.md` (Fase 5: "entrar na área de aluno com o teu número; ver Início, Histórico, Ranking, Calendário"), `dlbjj-build-spec.md` §16 (one entry: "2026-10-20 — área do aluno e painel novo, ver `docs/superpowers/specs/2026-10-20-area-do-aluno-design.md`")

- [ ] **Step 1: Write the failing test** — append to the `describe` in `tests/e2e/producao.test.ts`:

```ts
it("área do aluno em produção: /aluno → 307; entrar abre; número desconhecido não escreve nada; eventos do painel → 401", async () => {
  const r = await fetch(`${PROD_URL}/aluno`, { redirect: "manual" });
  expect(r.status).toBe(307);
  expect(r.headers.get("location")).toContain("/aluno/entrar");
  expect((await fetch(`${PROD_URL}/aluno/entrar`)).status).toBe(200);
  const form = { "content-type": "application/x-www-form-urlencoded" };
  const c = await fetch(`${PROD_URL}/api/aluno/codigo`, { method: "POST", headers: form, body: "telefone=351900000703", redirect: "manual" });
  expect(c.status).toBe(303);
  expect(c.headers.get("location")).toContain("passo=codigo");
  const { data } = await sb.from("dlbjj_fila_saida").select("id").eq("phone", "351900000703");
  expect(data).toEqual([]);
  const e = await fetch(`${PROD_URL}/api/aluno/entrar`, { method: "POST", headers: form, body: "codigo=123456", redirect: "manual" });
  expect(e.status).toBe(303);
  expect(e.headers.get("location")).toMatch(/\/aluno\/entrar$/);
  expect((await fetch(`${PROD_URL}/api/painel/eventos`, { method: "POST", headers: form, body: "titulo=x&dia=2026-12-01", redirect: "manual" })).status).toBe(401);
});
```

The production helper starts the app **with** Supabase (only the shared secrets are missing), so the 503-without-Supabase branches of the `/api/aluno/*` routes are a guard without a dedicated test; keep them (`supabaseConfigured()` first line).

- [ ] **Step 2: Run it to verify it fails or passes for the right reason**

Run: `VITEST_E2E=1 npx vitest run tests/e2e/producao.test.ts`
Expected: FAIL only if a route misbehaves in a production build (e.g. a 500); the new assertions should pass once Tasks 5 and 8 are in — this step exists to prove it in `next build && next start`, where `isProduction()` is true.

- [ ] **Step 3: Update the four docs**

- [ ] **Step 4: Full verify**

Run: `npm run verify > .superpowers/sdd/2026-10-20-area-do-aluno/verify.log 2>&1; echo VERIFY_EXIT=$? >> .superpowers/sdd/2026-10-20-area-do-aluno/verify.log; tail -30 .superpowers/sdd/2026-10-20-area-do-aluno/verify.log`
Expected: `VERIFY_EXIT=0`.

- [ ] **Step 5: Screenshots for the final message** — dev server on 3005; Chrome at 1440×900: `/aluno` (as Ana), `/painel`; at 375×812: `/aluno` with the drawer open. Save PNGs in the scratchpad and name their absolute paths in the final message. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/producao.test.ts AGENTE-WHATSAPP.md README.md docs/PRE-VOO.md dlbjj-build-spec.md
git commit -m "Produção fecha a área do aluno sem segredos; docs da área do aluno e do painel novo"
```
