# Área do aluno e painel novo — design

**Date:** 2026-10-20 · **Status:** draft for approval · **Branch:** `agente-openwa`
**Builds on:** `dlbjj-build-spec.md` (the agent, queue, painel, tokens, tests). Everything
there stays true unless this document says otherwise.

---

## 1. Intent and why

Daniel saw MatGoat's member dashboard (sidebar, greeting, belt card, big-number
cards with a faint training heatmap, "My Academy" section) and compared it with
our painel: ours looks like an admin table. He wants **that exact look** in two
places:

1. **The student** (praticante) gets their own area: classes this month, classes
   since they started, consecutive training days, their belt and their position
   in the academy ranking, and a calendar with classes and events.
2. **Daniel** gets the same shell and look, but sees everyone and keeps every
   admin capability he has today (conversations, students, classes, reactivation,
   ask-the-data, agent).

Students will come back often, so the 7-day WhatsApp magic link is no longer
enough: they get a lasting login by phone number plus a one-time code sent by
the WhatsApp bot (confirmed by Miguel).

## 2. Goals, non-goals, anti-goals

**Goals**

- A shared application shell (sidebar + top bar + content) that reproduces the
  reference screenshot's layout, spacing, typography and card style, used by
  `/aluno/*` and `/painel/*`.
- Student area: login by code, Início, Histórico, Ranking, Calendário, logout,
  sibling switch (one phone, several students).
- Admin: `/painel` becomes a dashboard; conversations move to
  `/painel/mensagens`; new `/painel/eventos`; every existing page reskinned.
- Events (seminars, gradings, competitions, closures) managed by Daniel and
  shown to students.
- Phone-first: students will open this on a phone.

**Non-goals (confirmed by Miguel)**

- No chat for students. Conversations stay Daniel-only, in the painel and on his
  phone, exactly as today.
- No videos, no private content, no invites, no notifications feed (the bell is
  a link with a dot, not an inbox).
- No web check-in: presence is still registered by writing `presente` on
  WhatsApp or by Daniel in the painel.
- No student profile editing, no password login, no multiple admins, no dark
  mode, no native app, no push notifications.

**Anti-goals** (would make this a failure even if it works)

- A student seeing another student's health, guardian, contacts, NIF, address,
  e-mail, birth date or phone. Ranking shows first names and belts only.
- The login code counting against the proactive ceiling, waiting for the
  09:00–21:00 window, or being blocked by an opt-out (it is a message the person
  just asked for).
- Anything that weakens the fail-closed posture (`tests/e2e/producao.test.ts`
  keeps passing: no secrets → nothing opens).
- A desktop-only layout.

## 3. Constraints

- Next.js 16.2 App Router conventions already in the repo (async `params`,
  `proxy.ts`, route handlers + HTML forms + 303, server-only data access, the
  React purity lint rule). Read `node_modules/next/dist/docs/` before writing.
- Tailwind 4 with the existing `@theme` tokens; Inter is already loaded as
  `--font-inter`; `lucide-react` is installed for icons.
- Every outgoing WhatsApp message is a row in `dlbjj_fila_saida` (one outbox).
  Login codes go out with `kind = 'sistema'`, which the worker's `decidir()`
  already lets through at any hour, ignoring opt-out and the ceiling; only the
  kill switch (`bot_enabled = off`) cancels it.
- pt-PT everywhere the user sees text. Lisbon time for every "today".
- Supabase service-role client, idempotent SQL migrations (next is
  `005_dlbjj_area_aluno.sql`), seed in `supabase/seed.sql`.
- Tests: Vitest unit (pure functions), integration (DB), e2e (`next dev` on
  3100 with `.env.test`), production check. `npm run verify` must stay green.
- Existing e2e tests that hit `/painel` as the leads list, `/painel/<phone>` and
  the `perfil` link are updated to the new paths and behaviour, not deleted.

## 4. The look (from the reference screenshot)

Reproduce this, not "something inspired by it":

```
┌──────────────┬───────────────────────────────────────────────────────────┐
│   [logo]     │                                        (bell·)  (AB)      │  top bar 72px, border-b
│              ├───────────────────────────────────────────────────────────┤
│ ▣ Início     │  Boa tarde, Ana 👋                       [📅 Aulas de hoje]│  h1 28px bold
│              │  ┌──────────────────────────────────────────────────────┐ │
│ TREINO       │  │ ▬▬▬▬▬■  Faixa Azul · 1 grau                          │ │  belt card
│ ∿ Histórico  │  │ 👤 Membro desde janeiro de 2024                       │ │
│ ⊥ Ranking    │  │ 🥋 Última aula: ontem (19 de outubro)                 │ │
│ ▦ Calendário │  └──────────────────────────────────────────────────────┘ │
│              │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐             │  4 stat cards
│              │  │ ⊛  ░░░ │ │ ▦  ░░░ │ │ ▩  ░░░ │ │ ⊥  ░░░ │             │  icon + faint heatmap
│              │  │ 12     │ │ 168    │ │ 3      │ │ 4.º    │             │  number 32px bold
│              │  │ Aulas… │ │ Aulas… │ │ Dias…  │ │ Posiç… │             │  label 15px gray
│              │  └────────┘ └────────┘ └────────┘ └────────┘             │
│              │  🏛 A minha academia                                       │  h2 22px bold
│ ✉ WhatsApp   │  ┌───────────────────┐ ┌───────────────────┐             │  2 wide cards
│ ⏻ Sair       │  │ 16 Aulas esta sem.│ │ 51 Presenças mês  │             │
└──────────────┴───────────────────────────────────────────────────────────┘
```

Tokens (define once in `app/globals.css` under `@theme`, prefix `app-`):

| Token | Value | Used for |
|---|---|---|
| `--color-app-bg` | `#ffffff` | sidebar, top bar, content, cards |
| `--color-app-page` | `#fafafa` | page background behind the content (phone only) |
| `--color-app-border` | `#e6e8ec` | every 1px border |
| `--color-app-text` | `#1f2434` | headings, numbers, nav labels |
| `--color-app-muted` | `#6b7280` | labels, secondary text, section captions |
| `--color-app-soft` | `#f1f3f5` | active nav item, avatar background, hover |
| `--color-app-accent` | `#ed1c24` (DL red) | badge, bell dot, primary button, today |
| `--color-app-icon` | `#3b4256` | outline icons in cards and nav |

- Font: Inter (`font-sans`). Sidebar 300px on ≥1024px, white, `border-r`.
  Logo `public/brand/logo.png` (black on white; the wordmark has white
  lettering and vanishes on white) centred at the top, 64px tall. Nav items
  40px tall, `rounded-lg`, icon 18px (lucide, stroke 1.75) + 15px label; active
  item has `bg-app-soft`. Section captions ("TREINO", "ACADEMIA") 11px uppercase
  `tracking-wider text-app-muted`, 24px above. Bottom of the sidebar holds the
  secondary links (WhatsApp da academia, Sair for the student; Site, Sair for
  Daniel).
- Top bar 72px, `border-b`, right-aligned: on Daniel's shell a bell icon with a
  red dot when something waits (§6); the student shell has no bell (nothing to
  notify in v1). Then a 36px round avatar with the person's initials
  on `bg-app-soft`. Clicking the avatar opens a small menu: name, sibling switch
  (student, when applicable), Sair.
- Content: `max-w-[1360px]`, padding 48px on desktop, 16px on phones. H1 28px
  bold `tracking-tight` with the 👋 emoji; the outline button on the right
  ("Aulas de hoje", calendar icon, `rounded-lg border px-4 py-2 text-sm`).
- Cards: `bg-white border border-app-border rounded-xl`, no shadow. Belt card
  padding 28px; stat cards padding 24px; number 32px bold leading-none; label
  15px `text-app-muted`; icon 28px top-left.
- **Heatmap:** the faint square grid in each card is **real data**: 7 rows
  (Mon→Sun) × 12 columns (last 12 weeks), 12px squares, 3px gaps, anchored to
  the card's right edge, `pointer-events-none`. Empty day `bg-app-soft`;
  1 class `#d9dce3`; 2+ `#b8bdc9`. Student cards use the student's check-ins;
  academy cards use academy-wide presences. Pure function
  `mapaDeCalor(presencas, hoje)` → 84 buckets.
- **Belt graphic:** an inline SVG `Faixa` component: a horizontal band in the
  belt colour (branca `#f4f4f5` with a gray border, cinzenta `#9ca3af`, amarela
  `#facc15`, laranja `#f97316`, verde `#16a34a`, azul `#2563eb`, roxa `#7e22ce`,
  castanha `#78350f`, preta `#111827`), a black tip on the right (red `#ed1c24`
  tip for preta), and `graus` white stripes on the tip. ~96×28px.
- **Phone (<1024px):** the sidebar is hidden; the top bar shows the logo on the
  left and a menu button on the right that opens the same nav as a slide-in
  drawer (client component, closes on navigation). Stat cards: 2 per row from
  640px, 1 per row below; academy cards 1 per row. No horizontal scroll at
  360px wide.

## 5. Student area (`/aluno/*`)

### 5.1 Getting in

- `/aluno/entrar` — step 1: one field, "O teu número de telemóvel", submit
  "Enviar código". POST `/api/aluno/codigo`:
  - normalise with the existing `normalizarTelefone` (9 digits → `351…`);
  - rate limits via `permitido()`: 3 codes per phone per hour, 10 requests per
    IP per 15 minutes, and 30 codes per day for the whole academy (a ban
    guard: codes skip the proactive ceiling, so they get their own) → 303 back
    with "Demasiados pedidos. Tenta mais tarde.";
  - if `bot_enabled` is `off`, show "O envio de códigos está desligado de
    momento. Fala com a academia." and stop; if `dlbjj_sessao` says `caido` or
    was last seen more than 10 minutes ago, show "O WhatsApp da academia está em
    baixo de momento. Tenta mais tarde." and stop (a code delivered an hour late
    is useless; no row → dev/first run → proceed);
  - if the phone has at least one student with estado `ativo` or `inativo`:
    create a 6-digit code (crypto random), store **its sha256** in
    `dlbjj_codigos_login` (expires in 10 minutes, `tentativas = 0`), and queue
    one `sistema` message to that phone:
    "O teu código para entrar na área de aluno DL-BJJ é *123456*. Vale 10
    minutos. Se não pediste este código, ignora esta mensagem.";
  - **whether or not the phone is known**, set an httpOnly cookie
    `dlbjj_entrar` (the normalised phone, 10 minutes) and 303 to
    `/aluno/entrar?passo=codigo` showing "Se este número tiver ficha de aluno,
    vais receber um código no WhatsApp." — no enumeration of who is a student.
- Step 2: one field, "Código", submit "Entrar". POST `/api/aluno/entrar`:
  - phone from the `dlbjj_entrar` cookie (missing → back to step 1);
  - take the newest unused, unexpired code for that phone with `tentativas < 5`;
    compare hashes; wrong → `tentativas + 1` and 303 back with `?erro=codigo`
    ("Código errado ou expirado."); 5 wrong → that code is dead, ask for a new one;
  - right → mark the code used, create the session (below), clear
    `dlbjj_entrar`, 303 to `/aluno`.
- **Session:** row in `dlbjj_sessoes_aluno` (`token_hash` pk, `phone`,
  `aluno_id` = the student being viewed, `expira_em` = now + 90 days,
  `criado_em`, `ultimo_uso_em`, `terminada_em`). Cookie `dlbjj_aluno` holds the
  raw 43-char token (httpOnly, sameSite lax, secure in production, path `/`,
  maxAge 90 days). Same token helpers as `lib/tokens.ts`.
- `lib/aluno/sessao.ts`: `sessaoAluno()` reads the cookie, finds a live session,
  loads the phone's students (`alunosDoTelefone`), returns `{ sessao, aluno,
  irmaos }`; `requireAluno()` redirects to `/aluno/entrar` when there is none;
  `sessaoAlunoOu401()` for route handlers. The layout **and** every page/handler
  call it (same defence-in-depth rule as the painel).
- One phone, several students (siblings on the guardian's phone): the session
  starts on the first student by `alunosDoTelefone` order; the avatar menu
  lists the others; POST `/api/aluno/escolher` (`aluno_id` must belong to the
  phone) updates the session row and 303s back.
- Logout: POST `/api/aluno/sair` sets `terminada_em`, deletes the cookie, 303
  `/aluno/entrar`.
- **The WhatsApp `perfil` keyword** keeps working and becomes the second door:
  the message changes to "Aqui tens o link para entrares na tua área de aluno,
  Ana: <url>/aluno/<token> (vale 7 dias)". Opening a valid link shows a small
  page "Entrar como Ana" with one button; that POST (`/api/aluno/link`)
  **claims the token atomically (single use), creates the same 90-day session
  and 303s to `/aluno`**. A GET never consumes it, so a link preview fetched by
  the gateway or the phone cannot burn it. The 3-per-day limit stays; the
  fourth request answers "Já te enviei 3 links hoje. Podes entrar em
  <url>/aluno/entrar com o teu número. 🙂". `proxy.ts` keeps its matcher and,
  inside `proxy()`, lets any `/aluno/<segment>` that is not a 20+ character
  token pass untouched, so `/aluno/entrar`, `/aluno/historico` etc. are never
  treated as tokens.
- Students with estado `ex_aluno` or `anonimizado` cannot log in (no code is
  sent; the generic message is shown).
- No Supabase configured: `/aluno/entrar` renders; the POSTs answer 503;
  `/aluno` redirects (307, what `redirect()` emits) to `/aluno/entrar`. The
  production check (`tests/e2e/producao.test.ts`) runs **with** Supabase and
  without the shared secrets, so it proves the other half: `/aluno` → 307,
  `/aluno/entrar` → 200, a code request for an unknown phone writes nothing,
  `/api/aluno/entrar` without the step-1 cookie goes back to step 1, and the
  painel event routes answer 401.

### 5.2 Início (`/aluno`)

- H1 "Bom dia / Boa tarde / Boa noite, {primeiro nome} 👋" (Lisbon hour: <12,
  12–19, ≥20). Button "Aulas de hoje" → `/aluno/calendario` (today's row is
  highlighted there).
- Belt card: `Faixa` graphic + "Faixa {Cor}" (+ " · N grau(s)"); "👤 Membro
  desde {mês de ano}" from `inicio_em` (or "—"); "🥋 Última aula: {hoje | ontem |
  há N dias} ({d de mês})" from the latest presence, or "ainda sem presenças".
- Four cards, in this order, each linking to the page that explains it:
  1. **Aulas este mês** — presences with `data` in the current Lisbon month.
     → Histórico.
  2. **Aulas desde o início** — all presences; sub-label "desde {mês ano}" of
     `inicio_em`. → Histórico.
  3. **Dias seguidos** — see 5.6. → Histórico.
  4. **Posição no ranking** — "4.º" + sub-label "de 37 este mês". → Ranking.
- "🏛 A minha academia": **Aulas esta semana** (sum over active turmas of their
  weekdays Mon–Sun of the current week), **Presenças este mês** (academy-wide),
  **Alunos ativos**, **Turma mais concorrida** (top of `rankingAulas(30)`,
  shown as "Jiu-Jitsu · Seg/Qua 19:30 · São Brás"). Counts only; nothing
  personal about anyone else.
- Footer line: "Para marcar presença escreve *presente* no WhatsApp da
  academia."
- Empty state (student with no presences yet): numbers show 0, streak 0,
  ranking "—", last class "ainda sem presenças", heatmaps all `bg-app-soft`.

### 5.3 Histórico (`/aluno/historico`)

- H1 "Histórico". A big heatmap (same component, 26 weeks) at the top with the
  caption "Últimos 6 meses".
- Presences grouped by month, newest first; each month heading "outubro de
  2026 · 12 aulas"; rows "seg 19 out · 19:30 · Jiu-Jitsu · São Brás". Load the
  last 12 months; "Ver mais antigas" links to `?desde=YYYY-MM` for older ones.
- Empty: "Ainda não tens presenças. Escreve *presente* no WhatsApp quando
  chegares à aula."

### 5.4 Ranking (`/aluno/ranking`)

- H1 "Ranking". Tabs "Este mês" (default) and "Desde sempre" (`?periodo=`).
- All students with estado `ativo` and `ranking_visivel = true`, ordered by
  presences in the period, dense ranking (ties share the position; the next distinct count gets the next
  number). Row: position, **first name only** (when two share a first name, add
  the surname initial: "Ana S."), belt pill (colour + "Azul · 1 grau"), count
  "12 aulas". The logged-in student's row is highlighted and the list auto-
  scrolls to it on phones. Students with 0 presences in the period appear at
  the end with "0 aulas".
- A header line "Estás em 4.º de 37". A student Daniel hid from the ranking
  (`ranking_visivel = false`, toggle on the painel student page) sees "Não
  apareces no ranking." here and "—" on Início, and is not counted in the total.
- Kids and adults share one ranking (confirmed: whole academy).

### 5.5 Calendário (`/aluno/calendario`)

- H1 "Calendário" with month navigation (`?mes=YYYY-MM`, default current),
  "‹ setembro" / "novembro ›", button "Hoje".
- A month grid, Monday first, 6 rows max. Each day cell shows: the student's
  classes that weekday (chips "19:30 Jiu-Jitsu"; the student's classes are the
  active turmas of their `local_slug` that match `tipoCombina` — export a pure
  `turmasDoAluno(aluno, turmas)` from `lib/bot/checkin.ts`); events (red-outlined
  chips with the title); a small dot when the student checked in that day;
  today's cell has the red number. On phones the grid becomes a list of days
  (each day a row) for the same month — a grid of 7 columns is unreadable at
  360px.
- Under the grid: "Próximos eventos" — the next 10 non-cancelled events from
  today, "sáb 8 nov · 10:00 · Seminário com … · Queluz". Events with no
  `local_slug` are academy-wide and show "Toda a academia". Every student sees
  every event, labelled with its location (a Queluz seminar interests a São
  Brás student too). Events are informational: they do not hide classes or
  affect "Dias seguidos" (no closure type in v1).
- Empty events: "Sem eventos marcados."

### 5.6 Definitions (pure functions in `lib/aluno/estatisticas.ts`, unit-tested)

- `aulasNoMes(presencas, hoje)`, `aulasDesdeInicio(presencas)`.
- `diasSeguidos(presencas, turmasDoAluno, hoje)`: walk back from today. Today
  without a check-in **does not break** the streak (the day is not over) and
  does not count. For each earlier day: check-in → +1; no check-in and none of
  the student's turmas run on that weekday → skip; no check-in on a day a turma
  runs → stop. If the student has no matching turmas, no day is skipped. Look
  back at most 366 days.
- `posicaoNoRanking(contagens, alunoId)` → `{ posicao, total }`, dense ranking.
- `mapaDeCalor(presencas, hoje, semanas)` → `{ dia, n }[]` with `semanas × 7`
  entries ending on this week's Sunday.
- `saudacao(instante)` → "Bom dia" | "Boa tarde" | "Boa noite".
- `descreverUltimaAula(data, hoje)` → "hoje (20 de outubro)", "ontem (19 de
  outubro)", "há 3 dias (17 de outubro)", "em 2 de setembro" when > 7 days.
- `mesDeCalendario(mes, turmasDoAluno, eventos, presencas, hoje)` → the cells.
- `aulasDaSemana(turmas, hoje)` → number of sessions Mon–Sun this week.

## 6. Daniel's painel (`/painel/*`)

- Same shell. Sidebar: **Início** (`/painel`); caption "ACADEMIA": Mensagens
  (`/painel/mensagens`, red badge = conversations waiting for him), Alunos,
  Aulas, Eventos, Reativação; caption "FERRAMENTAS": Perguntar, Agente. Bottom:
  Site (`/`), Sair. Greeting name is "Daniel" (one admin, password login as
  today). Avatar initials "DL".
- **Conversations waiting** = leads that are `paused` or `status = 'humano'`
  whose newest message in `dlbjj_mensagens` **with `role` `lead` or `humano`**
  is `direction = 'in'`. Rows with `role = 'bot'` (login codes, system
  messages) are ignored, so a student asking for a code does not make their
  waiting question vanish from the badge. Login codes do appear, in clear, in
  the thread Daniel sees (they live 10 minutes; he is the admin).
  One query, computed in `lib/painel/mensagens.ts`, used by the badge, the
  bell dot and the dashboard card.
- Bell: dot when conversations are waiting **or** `dlbjj_sessao.estado` is not
  `ligado`; links to `/painel/mensagens` (or `/painel/agente` when it is the
  session). Title attribute says which.
- **Início (`/painel`)** — the dashboard:
  - H1 "Boa tarde, Daniel 👋"; button "Aulas de hoje" → `/painel/aulas`.
  - Top card (in the belt card's place): **Agente de WhatsApp** — session state
    with "visto há N s", interruptor ligado/desligado, "N conversas à espera",
    "proativas hoje: 3 de 10". Links to `/painel/agente`.
  - Four cards: **Alunos ativos** → Alunos; **Presenças este mês** → Aulas;
    **Inscrições este mês** (students created this month) → Alunos;
    **Conversas à espera** → Mensagens.
  - "🏛 A minha academia": **Aulas esta semana**, **Turma mais concorrida (30
    dias)**, **Alunos inativos** → Reativação, **Toques pendentes** (toques
    `na_fila`) → Reativação. Heatmaps use academy-wide presences.
  - Supabase not configured: the existing "Falta configurar o Supabase" card.
- **Mensagens (`/painel/mensagens`)** is today's `/painel` list (filters, search,
  states) unchanged in behaviour; threads move to `/painel/mensagens/[phone]`.
  Every link, `revalidatePath`, `voltar()` and test that used the old paths is
  updated. A "Ver aluno" link stays on the thread when the phone has students.
- **Eventos (`/painel/eventos`)**: list "Próximos" and "Passados" (last 90
  days); form at the top: título (required, ≤80), dia (required, date), hora
  (optional), local (Toda a academia / Queluz / São Brás / Kids Amadora),
  descrição (optional, ≤500); POST `/api/painel/eventos` creates; each row has
  "Editar" (same form prefilled via `?editar=<id>`) → POST
  `/api/painel/eventos/[id]`; "Cancelar" → POST `/api/painel/eventos/[id]/cancelar`
  (soft: `cancelado_em`). Validation errors re-render with the message. 303 +
  `?erro=` pattern like the rest of the painel.
- Every other painel page (Alunos, Aluno, Novo aluno, Aulas, Aula, Reativação,
  Perguntar, Agente, Login) keeps its behaviour and tests and is rebuilt with the
  shared primitives: `PageHeader` (h1 + optional right action), `Card`, `Stat`,
  `Button` (primary = DL red, outline, ghost, danger), `Input`/`Select`/`Textarea`
  styles, `Table` (`border-b` rows, 14px, muted header), `Pill`. The login page
  is centred on `bg-app-page` with the wordmark above the card.

## 7. Data model

Migration `supabase/migrations/005_dlbjj_area_aluno.sql` (idempotent, RLS on
like the others):

```sql
create table if not exists dlbjj_codigos_login (
  id            uuid primary key default uuid_generate_v4(),
  phone         text not null,
  codigo_hash   text not null,               -- sha256 of the 6 digits
  expira_em     timestamptz not null,
  tentativas    int not null default 0,
  usado_em      timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists dlbjj_codigos_login_phone_idx on dlbjj_codigos_login (phone, created_at desc);

create table if not exists dlbjj_sessoes_aluno (
  token_hash    text primary key,
  phone         text not null,
  aluno_id      uuid not null references dlbjj_alunos(id),
  expira_em     timestamptz not null,
  criado_em     timestamptz not null default now(),
  ultimo_uso_em timestamptz,
  terminada_em  timestamptz
);
create index if not exists dlbjj_sessoes_aluno_phone_idx on dlbjj_sessoes_aluno (phone);

create table if not exists dlbjj_eventos (
  id            uuid primary key default uuid_generate_v4(),
  titulo        text not null,
  descricao     text,
  dia           date not null,
  hora          time,
  local_slug    text,                        -- null = toda a academia
  cancelado_em  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists dlbjj_eventos_dia_idx on dlbjj_eventos (dia) where cancelado_em is null;

alter table dlbjj_alunos add column if not exists ranking_visivel boolean not null default true;
```

- Anonymisation (`lib/anonimizar.ts`) also ends the student's sessions and
  deletes their login codes. The monthly cron also deletes codes older than a
  day and sessions expired for more than 30 days.
- `dlbjj_tokens.kind = 'perfil'` stays; opening one now consumes it.
- Seed: add presences for Ana, Rui, João and Inês spread over the last 10 weeks
  (so heatmaps, streaks and the ranking look alive), and two events (one
  academy-wide, one at Queluz). Keep the 20 existing rows and the counts the
  current tests assert; add rows with other dates rather than changing them.

## 8. Security and privacy

- Students read only: their own `AlunoPublico` columns, their presences, their
  graduações, active turmas, non-cancelled events, and aggregate counts.
  Ranking rows carry first name, surname initial when needed, belt, count.
  Nothing else about other people leaves the server. Explicit column selects,
  as everywhere in this repo.
- Code and session tokens are stored hashed. Codes: 10 minutes, 5 attempts,
  3 per phone per hour, 10 requests per IP per 15 minutes. Sessions: 90 days,
  revocable (logout, anonymisation).
- Both login POSTs and `/api/aluno/*` use the shared `permitido()` limiter and
  the same 503-without-Supabase and `isProduction()` rules as the rest.
- Cookies httpOnly, sameSite lax, secure in production. No student data in URLs
  (the phone lives in the `dlbjj_entrar` cookie, not the query string).
- The painel admin session is untouched.

## 9. Verification

Unit: every function in §5.6 (streak edge cases: today without check-in,
weekend skip, no matching turmas, 366-day cap; dense ranking ties; heatmap
buckets at week boundaries; greeting boundaries; calendar month with Monday
start and 6-row months).

Integration: code lifecycle (issue, wrong attempt increments, 5th locks,
expiry, reuse refused), session create/lookup/terminate, rate limits, events
CRUD + cancel, anonymisation ending sessions, conversations-waiting query.

E2E (one per journey, `.env.test`, codes read back from `dlbjj_fila_saida`):
1. Student logs in with a code (seed Ana), sees Início with her belt, "Aulas
   este mês" equal to the seed, ranking position, and the academy cards.
2. Unknown phone gets the same "Se este número tiver ficha…" screen and no
   queue row; wrong code five times → asked for a new one.
3. Sibling phone (João/Inês) → switch student → Início shows the other name.
4. `perfil` on WhatsApp → link → opening it lands on `/aluno` logged in; the
   link is dead on second use (410 page).
5. Ranking and Histórico render; Calendário shows a seeded event and today's
   class chip.
6. Daniel: `/painel` dashboard numbers; `/painel/mensagens` list and thread;
   `/painel/eventos` create → appears on the student calendar; cancel → gone.
7. Production check (Supabase set, secrets missing): `/aluno` → 307
   `/aluno/entrar`; `/aluno/entrar` 200; code request for an unknown phone →
   303 and nothing queued; `/api/aluno/entrar` without cookie → 303 step 1;
   `/api/painel/eventos` → 401; `/painel` still 307.

Definition of done: `npm run verify` green; on a 1440px screen `/aluno` and
`/painel` match the reference layout section by section (sidebar, top bar,
greeting + button, belt/agent card, four cards with heatmaps, academy section);
at 375px nothing scrolls sideways and the drawer works; a screenshot of each
is in the final message.

## 10. Builder check — calls made (2026-10-20)

A fresh reviewer read this document and asked nine questions. These are the
answers, all my calls unless marked; Miguel can overrule any of them.

1. **Ranking and consent.** Kids' first names, belts and counts are visible to
   every logged-in member of the academy. Daniel gets a per-student switch
   "Aparece no ranking" (`ranking_visivel`, default on) for anyone who objects.
   **For Miguel:** the enrolment consent text ("para a gestão da minha
   inscrição e das aulas") does not mention this; decide whether to add a line.
2. **Login codes in conversations.** They stay logged through `sendOutbound`
   (one door). "Waiting" ignores `role = 'bot'` rows (§6).
3. **Which events a student sees.** All of them, labelled with the location.
4. **Production check.** It runs with Supabase; see §5.1 and §9.7. 307, not 303.
5. **Closures.** No event type in v1; events never hide classes or break streaks.
6. **Student bell.** None.
7. **Code volume.** Global cap of 30 codes/day; no codes while the WhatsApp
   session is down (§5.1).
8. **Single-use link.** GET shows a confirm page; the POST consumes (§5.1).
9. **Logo.** `public/brand/logo.png`. The reference screenshot is committed as
   `docs/superpowers/specs/2026-10-20-referencia-matgoat.png`.

10. **(2026-10-20, after the first test) Miguel: the student does not see the academy-wide numbers.** The "A minha academia" section in §5.2 is removed from the student Início; those numbers live only on Daniel's painel. §5.2's academy cards and the matching e2e assertions are gone.

## 11. Left to the builder

- Exact component split and file names under `components/app/` (shell,
  sidebar, drawer, cards, belt, heatmap) and `lib/aluno/`.
- How the drawer and avatar menu are implemented (small client components;
  no new dependency).
- Query shapes and indexes beyond those listed; where to cache nothing (all
  `force-dynamic` like the painel).
- The precise Tailwind classes, as long as the tokens and measurements in §4
  are honoured.
- Icon choice per nav item and card (lucide: `House`, `Activity`, `Trophy`,
  `CalendarDays`, `MessageSquare`, `Users`, `Dumbbell`, `CalendarPlus`,
  `RotateCcw`, `Sparkles`, `Bot`, `Bell`, `Menu`, `LogOut` are suggestions).
- Seed values and the migration's exact DDL beyond §7.
- Test helper for the student session (sign in through the real code flow or
  insert a session row directly, as the e2e helpers do for the painel cookie).
