# Painel — ajustes após o primeiro teste — design

**Date:** 2026-10-20 · **Status:** draft for approval · **Branch:** `agente-openwa`
**Builds on:** `docs/superpowers/specs/2026-10-20-area-do-aluno-design.md` (the shell,
tokens, primitives, events, student area) and `dlbjj-build-spec.md`. Everything there
still holds unless this document says otherwise.

## 1. Intent

Miguel tested the painel on the dev server and sent six screenshots. Each one is a
decision below. The student area (`/aluno/*`) is untouched.

## 2. Decisions

### 2.1 Início
- The "Agente de WhatsApp" card is removed from `/painel`. That information lives
  only on `/painel/agente`, which gains the line "Proativas hoje: N de {tecto}".
- The bell keeps Daniel informed without the card: it lights (and links to
  `/painel/agente`) when the session row says `instavel`/`caido`, **when its
  `visto_em` is older than 10 minutes** (a crashed worker leaves `ligado`
  behind), and, **in production only**, when there is no session row at all
  (the worker never reported). In dev and in tests a missing row keeps the bell
  dark. One helper `estadoDaSessao(row, agora)` → `"ligada" | "instavel" |
  "caida" | "sem_sinal" | "nunca"` in `lib/painel/sessao-estado.ts`, pure,
  unit-tested, used by the layout and by `/painel/agente`.
- "Toques pendentes" becomes **"Reativações por enviar"** with the sub-label
  "mensagens automáticas agendadas". Same number (toques `na_fila`).

### 2.2 Mensagens — the conversation page (`/painel/mensagens/[phone]`)
Mirror the ARwatches conversation console: the thread is the centre, the person
is a rail on the right.
- **Layout.** From `xl` (1280px): `grid-cols-[minmax(0,1fr)_440px]`; the thread
  card fills the height (`min-h-[calc(100vh-72px-5rem)]`), composer at the
  bottom, unchanged behaviour. Below `xl` the rail is hidden and the thread
  header gets a **"Detalhes"** button that opens the same rail content in a
  slide-over sheet (client component, closes with the backdrop, Esc or ✕).
- **Rail sections**, in this order, each with an eyebrow caption (11px uppercase
  muted, like the sidebar captions):
  1. **Pessoa** — name (or "Sem nome"), `StatusBadge`, the "bot em pausa" and
     "telemóvel" chips, the phone, "primeiro contacto {dataPt}".
  2. **Situação** — the written summary (§2.3).
  3. **Lead** — definition list: Passo, Para, Modalidade, Espaço, Aula, Como
     conheceu, Primeira mensagem (when present), Nota (when present).
  4. **Ações** — the existing `LeadActions` buttons, stacked full-width.
  5. **Aluno** — "Ver aluno →" when `aluno_id`, else "Ainda não é aluno" and the
     "Enviar inscrição" hint.
- Back link "← Mensagens" stays above the grid.

### 2.3 Situação — the conversation summary
- Stored in its own table (not on the lead: an update there bumps
  `dlbjj_leads.updated_at`, which reactivation rule R3 reads, so every summary
  would push a follow-up back 10 days): migration `006_dlbjj_painel_ajustes.sql`
  creates `dlbjj_resumos (lead_id uuid primary key references dlbjj_leads(id),
  situacao text, quer text, mensagens int, ate timestamptz, em timestamptz)`,
  RLS on, upserted on each generation.
- **Generation**: `POST /api/painel/leads/[phone]/resumo` (session required, 303
  back to the thread). It loads the last 60 messages of the phone (oldest first,
  `role`, `body`, `created_at`), builds a pt-PT prompt and asks the model
  (`lib/painel/resumo.ts`, same OpenAI-compatible client and `OLLAMA_FAKE`
  switch as `lib/bot/nlu.ts`; the fake returns a deterministic summary built
  from the last inbound message) for exactly two short fields:
  `situacao` ("where the conversation stands", ≤ 240 chars) and `quer` ("what the
  person wants", ≤ 160 chars). Invalid or empty model output → 303 with
  `?erro=resumo` ("Não consegui resumir. Tenta outra vez.").
- **Rail rendering**: no messages → "Ainda não há conversa para resumir."; no
  summary yet → button "Escrever resumo"; summary → `situacao` as lead text,
  `quer` below in muted, then "N mensagens · até {diaCurto} · {timeAgo}" and the
  button "Atualizar"; when there are messages newer than `resumo.ate` →
  "Há conversa depois disto." in muted above the button.
- **Privacy** (decided here, Miguel can overrule): the summary is available on
  every lead, including paused/`humano` ones — those are the threads where it
  helps most, and the bot's "no LLM while paused" invariant is about the bot
  answering, not about Daniel asking for a summary. The prompt carries the
  thread text from both sides, **with login codes and token links redacted**
  (`*123456*` → `*[código]*`, `/inscricao/<token>` and `/aluno/<token>` →
  `/…/[link]`) by a pure `redigir(body)` that is unit-tested. Nothing from
  `dlbjj_alunos` is sent. `AGENTE-WHATSAPP.md` §5 gains a paragraph: on Daniel's
  request, the text of a conversation (including what was said during a
  handoff) goes to Ollama Cloud to be summarised; he decides when to press the
  button, and he must be told this in writing with the rest of §5.

### 2.4 Aulas — by gym, then a weekly timetable
- `/painel/aulas` becomes **one card per gym** (`locais` from `content/site.ts`
  that have active turmas): name, morada, "N turmas", "N presenças (30/90 dias)",
  "N alunos ativos" (`dlbjj_alunos.estado = 'ativo'` and `local_slug`). The
  30/90 toggle stays. The chip **"a aula com mais alunos"** moves to a line
  under the cards: "Turma mais concorrida: {turma} · {local} · {dias} {hora}"
  with the chip, so Daniel still sees it at a glance. Each card links to
  `/painel/aulas/espaco/[slug]?dias=`.
- `/painel/aulas/espaco/[slug]` — **weekly timetable**: columns = weekdays that
  have at least one class in this gym (Monday first), rows = the distinct start
  hours of this gym's classes (ascending), cell = the class block(s): turma name,
  `HH:MM`, "N presenças · N alunos" in the period; the block links to
  `/painel/aulas/[turmaId]`. Pure `grelhaSemanal(turmas: LinhaRanking[]) →
  { dias: number[]; horas: string[]; celulas: Record<string, LinhaRanking[]> }`
  keyed `${dia}|${hora}` in `lib/aulas/grelha.ts`, unit-tested (two classes at
  the same hour on the same day stack; a gym with no classes → empty grid and
  the page says "Sem turmas ativas neste espaço."). Below `lg` the grid becomes
  a list grouped by weekday (same blocks). Unknown slug → `notFound()`.
- `/painel/aulas/[turmaId]` (presence list) is unchanged; its back link goes to
  the gym's timetable.

### 2.5 Eventos — calendar first, modal to create and edit, calendar feed
- `/painel/eventos?mes=YYYY-MM` shows the **month grid** (reuse `mesDeCalendario`
  with no turmas and no presences: events only; `mesValido`, ‹ › and "Hoje" like
  the student calendar; below `lg` the day list) with a **"Novo evento"** button
  in the page header. A day cell is a link to `?mes=…&novo=YYYY-MM-DD`; an event
  chip is a link to `?mes=…&editar=<id>`.
- **Modal**: when `novo` or `editar` is in the URL the page renders `EventoModal`
  (client component: a fixed overlay + dialog, `role="dialog"`,
  `aria-modal`, focus on the first field, Esc and the backdrop navigate back to
  `?mes=…`). Inside, the existing form (título, dia prefilled, hora, local,
  descrição) posting to the existing routes; in edit mode also the "Cancelar
  evento" form. The routes keep `voltar("/painel/eventos", …)` but now carry
  `mes` so the user lands on the month they were on. Validation errors reopen
  the modal with the message (`?erro=…&novo=…` / `&editar=…`).
- "Próximos" list stays under the calendar (next 10). "Passados (90 dias)" goes;
  the month navigation covers it. Cancelled events stay on the painel's month
  grid, struck through (review finding: a mis-click must leave a trace); the
  student calendar never shows them.
- **Calendar feed** (`§sync`): `GET /api/painel/eventos.ics?chave=<chave>` returns
  `text/calendar` with every non-cancelled event: `UID <id>@dlbjj.org`, `DTSTART`
  as `VALUE=DATE` when there is no hour, else local time with
  `TZID=Europe/Lisbon` (a `VTIMEZONE` block is not needed by Google/Apple for a
  one-way feed; use UTC `DTSTART` computed with `instanteLisboa` instead, which
  every client understands), `DTEND` = start + 1 h (or next day for all-day),
  `SUMMARY`, `DESCRIPTION`, `LOCATION` (gym name or "Academia DL-BJJ"),
  `DTSTAMP`, `X-WR-CALNAME: DL-BJJ — eventos`. Pure `icsDe(eventos, agora)` in
  `lib/eventos-ics.ts`, unit-tested (line folding not needed under 75 chars;
  escape `,` `;` `\n`; CRLF line endings).
  - `chave` = a random 32-byte secret stored in `dlbjj_settings.ics_chave`,
    created on first use and rotated with a "Gerar nova chave" button
    (`lib/painel/ics-chave.ts`, byte-length-safe timing-safe compare). It is
    **not** derived from the painel password (review finding: the feed URL
    lives in Google, Apple Calendar, clipboards and request logs, and a fast
    hash of the password would make it an offline attack on the only painel
    credential). No cookie: Google fetches the URL itself. Wrong/missing key →
    401. No `DASHBOARD_PASSWORD` → 503 in production, 401 in dev (fail closed,
    like the painel). Rate limit 60/min/IP.
  - The Eventos page shows a card **"Sincronizar com o teu calendário"** with the
    full `webcal://` and `https://` URLs (built from `APP_BASE_URL`), a copy
    button, and two-line instructions: Google Calendar → "Outros calendários →
    Subscrever por URL"; iPhone/Mac → open the `webcal://` link. One-way: edits
    in Google do not come back. "Gerar nova chave" rotates the key.

### 2.6 Perguntar — removed for now
- Delete `app/painel/perguntar/page.tsx`, `app/api/painel/perguntar/route.ts`,
  the nav entry and `tests/e2e/perguntar.test.ts`. Keep `lib/perguntar/*` and
  its unit/integration tests (the catalogue is still correct and may return).
  The "FERRAMENTAS" caption keeps only "Agente". Docs mention it is switched off.

## 3. Non-goals
Two-way Google sync (OAuth), a chat for students, editing events from the
student calendar, per-user calendar feeds, drag-and-drop in the timetable.

## 4. Constraints
Same as the previous design: Next 16 conventions (read the docs first), pt-PT,
Lisbon time, explicit selects, HTML forms + route handlers + 303, fail-closed
in production, `npm run verify` green, tests updated not deleted (except
Perguntar's e2e, whose feature is gone). Design tokens and primitives from
`components/app/*`.

## 5. Verification
- Unit: `grelhaSemanal`, `icsDe`, `resumo` prompt parsing (`extrairResumo` on
  good/bad model output), `chaveIcs`.
- Integration: `gerarResumo` with the fake stores the jsonb and detects
  "newer messages".
- E2E: dashboard no longer shows the agent card and shows "Reativações por
  enviar"; thread page has the rail (`data-rail`), "Escrever resumo" → POST →
  summary text and "N mensagens" appear, a new inbound message → "Há conversa
  depois disto."; gyms page cards + chip line; timetable for São Brás shows
  "19:30" under segunda and quarta and links to the class; Eventos calendar
  shows the seeded events, `?novo=` renders the dialog, create via the modal
  form lands on the same month, `?editar=` prefills; ICS feed 200 with the
  seeded events, 401 wrong key; production check: ICS without password → 503;
  `/painel/perguntar` → 404.
- Definition of done: `npm run verify` green and a screenshot of each of the
  five changed pages at 1440px.

## 6. Builder check — calls made (2026-10-20)

1. **What the summary sends to Ollama Cloud**: the whole thread, both
   directions, codes and token links redacted; available on every lead. See §2.3.
2. **Worker down without the home card**: the bell lights on a stale heartbeat
   (10 min) and, in production, on a missing session row; `/painel/agente` shows
   the proactive count. See §2.1.
3. **Summary must not count as lead activity**: separate `dlbjj_resumos`
   table. See §2.3.

## 7. Left to the builder
Component split, the sheet/dialog implementation (no new dependency; a small
client component each), the exact prompt wording for the summary, ICS
details beyond §2.5, the timetable's visual density.
