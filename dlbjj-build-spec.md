# Academia DL-BJJ — Agente de WhatsApp, Inscrições e Alunos — Build Spec

**One-line mission:** Turn every WhatsApp message to the academy's number (351925797266) into a booked trial class and, later, a tracked student who checks in by WhatsApp and gets a message before they drift away — all run by Daniel Lopes from one password-protected panel.

Written 2026-10-19 from a four-round interview with Miguel Carvalhal. Every fork is resolved below. Settled decisions are listed in §0.3 and are not to be reopened.

---

## 0. How to use this document

You are building this unattended. Nobody will answer questions while you work, so:

1. **This document outranks your instincts.** Where it names a rule, a number, or a stack choice, follow it even if you would have chosen differently.
2. **When you hit something genuinely unspecified, decide and keep moving.** Do not stall and do not invent scope. Pick the smallest choice consistent with §1 and §2, append it to the Decisions Log in §16 with one line of reasoning, and continue.
3. **§13 is your finish line.** Check your work against those scenarios rather than waiting for a human to confirm. Work is done when they pass, not when the code looks finished.
4. **The non-goals in §2 are binding.** If a change would be genuinely useful but sits outside them, note it in §16 as a suggestion and do not build it.

### 0.1 Read these before writing code

- `AGENTS.md` in this repo: **this is Next.js 16.2.10, not the Next.js you know.** Read `node_modules/next/dist/docs/` (start with `index.md`, then `01-app/`) before touching any route, server action or `proxy.ts`. Do not upgrade Next.
- `AGENTE-WHATSAPP.md` and `docs/PRE-VOO.md`: what exists and what was never run. Both describe the Meta Cloud API transport, which this spec removes. You will rewrite both at the end (§15).
- `content/site.ts`: the single source of truth for locations, classes and schedules. Never duplicate schedule data by hand; seed from it (§7, `dlbjj_turmas`).
- `lib/bot/*`, `lib/messaging/*`, `app/painel/*`, `supabase/migrations/*`: the onboarding engine, provider interface, panel and tables you are extending. Read all of it. Keep what works.
- **Reference implementation, read-only:** `/Users/miguelcarvalhal/Documents/Projects/MirasideAI/clients/ARwatches`. Read `WHATSAPP.md` §2.1, §7, §8, §9.2, §13; `worker/src/transport/openwa.ts`; `worker/src/inbound/{webhook,normalize,handoff}.ts`; `worker/src/outbound/drainer.ts`; `worker/Dockerfile`; `docker/docker-compose.yml`; `docker/README.md`. Copy the **patterns and the verified gateway facts** (header names, endpoint paths, status vocabulary, the two endpoints that must never be called). Do not copy code wholesale: that project stores data in Convex, has Instagram, voice transcription, VIPs and a sales flow. None of that exists here.

### 0.2 House conventions (already in this repo; keep them)

- All user-visible text in **português de Portugal** (tu-form, "telemóvel", "ecrã"). Domain values in pt-PT (`em_progresso`, `concluido`). Table names `dlbjj_<nome>`. Comments may be pt-PT or English. Identifiers in code may be English.
- No Postgres enums: `text` + `check`, mirrored as `as const` unions in `lib/bot/types.ts` with pt-PT label maps.
- Every `process.env` read lives in `lib/config.ts` (app) or `worker/src/config.ts` (worker). Nothing else reads env.
- Fail closed in production: a missing secret closes the door, never opens it (see `lib/auth.ts`, `lib/sim-guard.ts`, `isProduction()`).
- Migrations are idempotent SQL files in `supabase/migrations/`, numbered `NNN_<nome>.sql`.

### 0.3 Settled decisions — do not reopen

| Decision | Choice |
|---|---|
| WhatsApp transport | `rmyndharis/OpenWA` **0.14.4**, engine **Baileys**, in Docker on a VPS. **Not** `@open-wa/wa-automate`. Not the Meta Cloud API. The Cloud API adapter and webhook are deleted, not kept as fallback. |
| Where the gateway and worker run | The **same VPS as ARwatches**, as a **separate Compose project** (`COMPOSE_PROJECT_NAME=dlbjj`), own network, own volume, own API key, own session, own ports. |
| App ↔ gateway wiring | ARwatches pattern: gateway is loopback-only; a Node worker on the VPS receives gateway webhooks, forwards inbound to the Next.js app over HTTPS, and drains an outbound queue in Supabase. **The brain stays in the app.** |
| LLM | **Ollama Cloud** via the OpenAI-compatible endpoint already wired in `lib/bot/nlu.ts` (`OLLAMA_*`). Used only for (a) interpreting free text during onboarding and (b) choosing and formatting ask-the-data answers. |
| Database | A **new, dedicated Supabase project** for DL-BJJ. Same env var names. Local development and all tests run on `supabase start`. |
| Attendance | **Student-initiated check-in by WhatsApp**, no reminders. Daniel can also mark presence on the panel. |
| Student view | **Web page via magic link** sent by the bot on request. |
| Enrolment form | Public web form, link sent **by Daniel from the panel** (button on the lead). Collects identity, guardian (minors), health/emergency, training details. |
| Reactivation cadence | **Conservative**: lead abandoned → 24 h and 72 h; lead confirmed but never checked in → 10 days; student silent → 14 days, then 30 days (then marked inativo and left alone). Proactive sends capped at **10/day**, 09:00–21:00 Europe/Lisbon. |
| Panel users | **Daniel only**, one shared password (existing `DASHBOARD_PASSWORD` + signed cookie). |
| Ask-the-data | **Fixed read-only tool catalogue** chosen by the LLM. Never LLM-written SQL. |
| Tests | Unit + integration + one end-to-end per journey. |
| Definition of Done | `npm run verify` green; Docker stack boots on the VPS from the runbook alone; only QR/pairing and env values are manual. |

---

## 1. Primary user and outcome

**Primary user:** Daniel Lopes, owner and head coach of Academia DL-BJJ, who runs three locations (Queluz, São Brás, BJJ Kids Amadora) from his phone's WhatsApp and one browser tab, and has no admin staff.

**Outcome:** Every person who writes to 351925797266 gets a trial class booked without Daniel typing; every person who tries a class can be enrolled with one link; every enrolled student's belt, start date and attendance are on file; and nobody stops training without being contacted once or twice and then left in peace.

**Narrowing principle:** This is a **WhatsApp-first CRM for one academy**. If a feature is not reachable from a WhatsApp message or from Daniel's panel, or it exists to serve a second academy, a second channel, or money, it is not this product.

## 2. Non-goals

- **Payments, billing, mensalidades, pricing** — the bot never states a price (existing rule in `lib/bot/nlu.ts`); no plan, invoice or subscription data exists anywhere. Money is Daniel's job, in person.
- **Multi-academy tenancy** — one academy, three locations hard-coded in `content/site.ts`. No `academia_id` column anywhere.
- **Instagram or any second channel** — WhatsApp only. The ARwatches GHL/Instagram transport is not ported.
- **Native app or PWA for students** — the magic-link page (§4) is the whole student surface.
- **Class capacity, booking or waiting lists** — a check-in records presence after the fact. Nothing reserves a spot or counts seats.
- **Audio transcription** — voice notes get the existing reply "[áudio] — podes escrever por texto, por favor?". No speaches container.
- **Instructor logins or roles** — Daniel is the only panel user. No user table.
- **Competition and event management** — out.
- **Meta Cloud API as a fallback** — deleted. If the number is ever banned, that is a new project, not a hidden code path.
- **Writing student data through the ask-the-data chat** — the chat is read-only. Belt changes and notes go through panel forms.

## 3. Journeys

Phone numbers are E.164 digits without `+` (e.g. `351912345678`) everywhere, as today.

### Journey A — Onboarding a lead (happy path; exists, adapted to the new transport)
1. A person taps the site's WhatsApp button (pre-filled text from `content/site.ts: whatsappMensagem`) or just writes "Olá".
2. The gateway fires `message.received` → worker → `POST /api/agent/inbound` → `handleInbound()`.
3. The engine runs the existing state machine: name (skipped when the prefill parser finds it) → "para ti ou para um/a filho/a?" → modalidade (skipped for kids) → espaço (skipped when only one fits) → horário → "como nos conheceste?" → resumo → "Sim, confirmo".
4. Every question with options is sent as **numbered text** (§4.0), never as interactive buttons.
5. On "Sim, confirmo": lead `status = concluido`, bot sends the existing `confirmedText`. Daniel sees the lead at `/painel` with the chosen class.

### Journey A′ — Onboarding, unhappy: no compatible class / sensitive question
1. Person picks NoGi for a child, or writes "o meu filho tem autismo, podem acompanhar?".
2. Engine finds zero compatible locations, or the LLM returns `needs_human = true`.
3. Bot sends "Para esse pedido, o melhor é falares diretamente com o Daniel. Já lhe passo a tua mensagem. 🙏", sets `paused = true`, `status = humano`, `human_reason`.
4. Lead shows the red "Com humano" badge on `/painel`; Daniel replies from the panel or from his phone. Nothing automatic is sent to this person while paused, **except** check-in and profile keywords (§6.5).

### Journey B — Inscrição (enrolment)
1. After the trial class, Daniel opens `/painel/<phone>` and presses **"Enviar inscrição"**.
2. Server creates a token (§7, `dlbjj_tokens`, kind `inscricao`, 14-day expiry, single use) and queues a message: "Olá {nome}! Para concluir a tua inscrição na DL-BJJ, preenche este formulário (demora 2 minutos): {APP_BASE_URL}/inscricao/{token}". The queue row has `kind = sistema`.
3. Person opens the form, fills identity, guardian (shown only when birth date makes them under 18), health/emergency, training details, ticks the RGPD consent, submits.
4. Server validates (§6.9), creates `dlbjj_alunos` row + first `dlbjj_graduacoes` row, links `dlbjj_leads.aluno_id`, sets lead `status = inscrito`, marks the token used.
5. Page shows "Inscrição recebida. Vais receber uma confirmação no WhatsApp." Bot queues: "Inscrição recebida, {nome}! Bem-vindo/a à família DL-BJJ. 🥋 Quando vieres treinar, manda-me *presente* e eu registo a tua presença."

### Journey B′ — Inscrição, unhappy: expired or used link
1. Person opens the link 15 days later, or a second time.
2. Page renders status 410 with: "Este link já não é válido. Escreve-nos no WhatsApp (925 797 266) e enviamos-te um novo." No form, no data shown.
3. Nothing is written. Daniel can press "Enviar inscrição" again; the old token stays revoked.

### Journey C — Check-in
1. Student (or guardian) writes "presente" at 18:40 on a Tuesday.
2. Engine matches the phone to `dlbjj_alunos` (one or more students), then finds today's classes in `dlbjj_turmas` at that student's `local_slug` whose `tipo` matches the student (`kids` for `publico = kids`; otherwise `tipo = modalidade`, with `misto` counting for `jiu-jitsu` and `nogi`). If that yields nothing, fall back to every active class at that academy today. If still nothing, Journey C′.
3. Exactly one match → insert `dlbjj_presencas` (unique on aluno + turma + data) → reply "Presença registada: Kids · Terça 18:30 · Queluz. Bom treino, Ana! 🥋". A student with `status = inativo` flips back to `ativo`.
4. Several classes today → reply with numbered options; the next digit resolves it. Several students on the phone → "Para quem é a presença? 1 João 2 Maria 3 Os dois".

### Journey C′ — Check-in, unhappy: no class today / not a student
1. Student writes "presente" on a Sunday.
2. Reply: "Hoje não há aulas em Queluz. A próxima é terça às 18:30 (Kids)." Nothing is written.
3. A lead with no student record writes "presente": reply "Ainda não tens inscrição concluída. Vou avisar o Daniel para te enviar o formulário. 🙏" and the lead gets `human_reason = "pediu check-in sem inscrição"`, `paused = true`.

### Journey D — Reactivation (automatic)
1. Vercel cron calls `GET /api/cron/reativacao` hourly.
2. The rule evaluator (§5, R1–R5) finds who is due, checks opt-outs and that no touch for that rule was already sent, and inserts one `dlbjj_fila_saida` row per person with `kind = proativa`, `regra = R4`, a `enviar_apos` spread over the next 3 hours.
3. The worker drains the queue: at send time it re-checks opt-out, bot switch, 09:00–21:00 window, daily ceiling (10), backpressure; sends with typing indicator; records a `dlbjj_toques` row.
4. The person replies "sim, quero voltar" → normal inbound; Daniel sees it at `/painel` with the "respondeu a R4" marker on the lead.

### Journey D′ — Reactivation, unhappy: opt-out
1. The person replies "não quero mais mensagens".
2. The deterministic opt-out matcher (§5) fires before any LLM call. Server inserts `dlbjj_opt_outs` (sha256 of phone), cancels every pending proactive row for that phone, replies once: "Entendido, {nome}. Não voltamos a enviar-te mensagens. Se mudares de ideias, é só escrever. 🙏".
3. From then on every proactive send to that phone is rejected at send time (§6.2). Replies to messages they initiate still work.

### Journey E — Daniel asks the data
1. Daniel opens `/painel/perguntar` and types "quantos alunos ativos temos em Queluz?".
2. Server asks the LLM to pick **one** tool from the catalogue (§5) and its arguments as JSON (same extract-JSON pattern as `lib/bot/nlu.ts`), runs the tool against the database, then asks the LLM to phrase the rows in pt-PT.
3. Panel shows the answer and, under it, the tool used and the row count. The question is logged in `dlbjj_perguntas`.

### Journey E′ — Ask-the-data, unhappy: unknown question
1. Daniel types "qual é a melhor estratégia de marketing?".
2. The LLM returns `tool = null`; server answers verbatim "Não sei responder a isso com os dados que tenho. Posso dizer-te: alunos por academia, faixa de um aluno, presenças por turma, quem está em risco, leads por origem." No LLM text reaches the screen.

### Journey F — Student profile link
1. Student writes "perfil" (or "a minha faixa", "a minha ficha").
2. Engine creates a `dlbjj_tokens` row kind `perfil`, 7-day expiry, bound to that aluno, and replies "Aqui tens a tua ficha, João: {APP_BASE_URL}/aluno/{token} (válido 7 dias)." Limit 3 links per phone per day; beyond that reply "Já te enviei o link hoje — usa o anterior. 🙂".
3. Page shows name, academy, modality, current belt and stripes with date, start date, presences in the last 30 days, last check-in, next three classes. Read-only.

### Journey F′ — Profile, unhappy: expired link
1. Link opened after 7 days → 410 "Este link expirou. Escreve *perfil* no WhatsApp para receberes um novo." No data rendered.

### Journey G — Daniel answers from his phone (handoff)
1. The bot is mid-onboarding with a lead. Daniel sees it on his phone and types a reply himself.
2. The gateway fires `message.sent` with a message id the worker did not produce.
3. Worker sets the lead `paused = true`, `status = humano`, `human_reason = "Daniel respondeu pelo telemóvel"`, `humano_ate = now + 24 h`, and logs the message as `role = humano, direction = out`.
4. Bot stays silent in that chat. After 24 h without another phone message from Daniel, or when Daniel presses "Retomar bot", the engine re-asks the current step.

### Journey H — Gateway or app unavailable (resilience)
1. The VPS reboots. Docker restarts the gateway, then the worker (`depends_on: service_healthy`).
2. Worker boots: validates config, re-registers (or rewrites) its webhook subscription, reclaims stale leases, resumes draining. Nothing is sent twice: a row whose send started but never got a `messageId` is `desconhecido`, shown in red on `/painel/agente`, never retried automatically.
3. If the Vercel app is down when an inbound arrives, the worker stores the delivery in `dlbjj_entradas_falhadas` and retries with backoff [30 s, 5 min, 30 min]; after 3 failures the row is flagged on `/painel/agente`.

## 4. Screens and states

### 4.0 WhatsApp message formats (the main UI)

Baileys does not deliver interactive buttons or lists reliably. Replace `sendButtons`/`sendList` with **numbered text**:

```
A inscrição é para ti ou para um/a filho/a?

1. Para mim
2. Para o/a filho/a

(Responde com o número)
```

Rules: options are `1.`–`9.` on their own lines; a blank line before and after the list; the hint line only when there are options. Inbound resolution, in order: a bare digit → option by index; exact or accent-insensitive match of an option title → that option; otherwise the LLM (`interpret()`) as today with `confidence >= 0.6`; otherwise "Desculpa, não percebi bem. 🙂 Responde com o número da opção." and re-ask. Keep internal option ids (`pub:kids`, `hor:2`) exactly as today so `lib/bot/flow.ts` is untouched.

Emoji use stays as in `lib/bot/flow.ts`. Bold with `*asteriscos*`. Max 900 characters per message; split on blank lines when longer.

### `/painel/login` (exists)
- **Primary action:** enter password. **Secondary:** none.
- **Empty:** the form. **Loading:** submit button disabled with "A entrar…". **Error:** "Password incorreta." (exists) and, after 5 failures from the same IP in 15 min, "Demasiadas tentativas. Tenta daqui a 15 minutos." **Success:** redirect to `/painel`.

### `/painel` — Inscrições (leads list; exists, extended)
- **Primary action:** open a lead. **Secondary:** filter by status (Todos / Novo / Em progresso / Concluído / Inscrito / Com humano / Perdido / Descartado); search by name or phone.
- **Empty:** existing "Ainda não há leads…" card. **Loading:** server-rendered; the 10 s refresher keeps it live (exists). **Error:** existing "Falta configurar o Supabase" card when env is missing; a red banner "Não foi possível ler as leads: {mensagem}" on query error. **Success:** rows with status badge, "bot em pausa" chip, and a new chip "telemóvel" when `human_reason` starts with "Daniel respondeu".

### `/painel/[phone]` — Lead (exists, extended)
- **Primary action:** read and reply. **Secondary:** Pausar/Retomar bot (exists), Marcar concluído, Descartar (exist), **Enviar inscrição**, **Ver aluno** (when `aluno_id` is set), **Marcar como perdido**.
- **Empty:** "Lead não encontrada ({phone})." (exists). **Loading:** buttons disabled while pending (exists). **Error:** inline red line under the actions "Não foi possível enviar: {mensagem}"; a queued message that later fails shows a red "falhou" tag on the bubble. **Success:** the outgoing bubble appears with tag "na fila", then "enviado" when the worker confirms.

### `/painel/alunos` — Alunos
- **Primary action:** open a student. **Secondary:** filters Academia (Queluz / São Brás / Kids), Estado (Ativo / Inativo / Ex-aluno), Faixa; search; **"Novo aluno"** (manual creation, same fields as the form).
- **Empty:** "Ainda não há alunos. Envia o formulário de inscrição a partir de uma lead, ou cria um aluno manualmente." with the "Novo aluno" button. **Loading:** server-rendered. **Error:** red banner with the message. **Success:** table: nome, academia, faixa + graus, último check-in (há N dias), estado badge.

### `/painel/alunos/[id]` — Ficha do aluno
- **Primary action:** read the record. **Secondary:** **Registar graduação** (faixa, graus, data, nota), **Marcar presença** (turma + data), **Editar ficha**, **Enviar link do perfil**, **Marcar inativo / ex-aluno**, **Anonimizar** (confirmation dialog typed "ANONIMIZAR"), link to the WhatsApp thread.
- **Empty:** sections with "—"; belt history "Sem graduações registadas." **Loading:** disabled buttons while pending. **Error:** inline red lines per form; server validation messages in pt-PT. **Success:** the new graduação/presença row appears at the top of its list; a green "Guardado." line for 3 s.
- Guardian block and health block render **only on this page**, never in lists or in the chat.

### `/painel/aulas` — Aulas
- **Primary action:** see which classes fill up. **Secondary:** period selector (30 / 90 dias); open a class.
- **Empty:** the class list from `dlbjj_turmas` with "0 presenças" and the line "Ainda não há presenças registadas." **Loading:** server-rendered. **Error:** red banner. **Success:** ranked table: turma · local · dias · horário · presenças no período · alunos distintos. The top row carries the chip "a aula com mais alunos".

### `/painel/aulas/[turmaId]` — Uma aula
- **Primary action:** mark presence for a date. **Secondary:** choose date (defaults to the most recent weekday this class runs).
- **Empty:** checklist of active students of that academy with nobody ticked. **Loading:** checkbox disabled while saving. **Error:** red line "Não guardou: {mensagem}" next to the student. **Success:** tick persists; the count at the top updates.

### `/painel/reativacao` — Reativação
- **Primary action:** see who is due and what was sent. **Secondary:** per row **Saltar** (skips this rule for this person, recorded as a touch with `estado = saltada`), **Enviar agora**; global **Correr regras agora**; list of opt-outs (hash prefix + date only).
- **Empty:** "Ninguém está em atraso. As regras correm de hora a hora." **Loading:** buttons disabled while pending. **Error:** red banner with the message; a row whose send failed shows "falhou" with the gateway error. **Success:** counter "Enviadas hoje: N / 10" and the table of queued, sent and replied touches.

### `/painel/agente` — Agente
- **Primary action:** the kill switch (Ligado / Desligado) writing `dlbjj_settings.bot_enabled`. **Secondary:** none.
- **Empty (no heartbeat yet):** "O worker ainda não reportou. Segue o runbook em docker/README.md." **Loading:** switch disabled while pending. **Error:** session state `caido` renders a red card "Sessão WhatsApp em baixo: {detalhe}"; `instavel` renders amber; failed inbound deliveries render a red list "Mensagens recebidas por processar". **Success:** green card with phone, estado, "visto há N s", enviadas/recebidas hoje, rows `desconhecido` in the queue (if any).

### `/painel/perguntar` — Perguntar
- **Primary action:** ask a question. **Secondary:** the list of example questions as chips.
- **Empty:** the chips and the input. **Loading:** "A pensar…" with input disabled; 20 s timeout. **Error:** "Não consegui responder agora ({motivo}). Tenta outra vez." **Success:** answer bubble; below it, small grey "ferramenta: {nome} · {n} linhas".

### `/inscricao/[token]` — Formulário de inscrição (public)
- **Primary action:** submit. **Secondary:** none.
- **Empty:** the form, pre-filled with the lead's name, modalidade and local when known. **Loading:** submit button "A enviar…" disabled. **Error:** field-level messages ("Data de nascimento obrigatória", "Para menores é obrigatório o encarregado de educação", "NIF inválido"); 410 page for expired/used token; 429 "Demasiados pedidos" after 10 submits/min/IP. **Success:** "Inscrição recebida. Vais receber uma confirmação no WhatsApp."

### `/aluno/[token]` — Ficha do aluno (public, read-only)
- **Primary action:** read. **Secondary:** none.
- **Empty:** never (a token always resolves to a student) — attendance block shows "Sem presenças nos últimos 30 dias." **Loading:** server-rendered. **Error:** 410 "Este link expirou…" (§3 F′); 404 for an unknown token. **Success:** name, academia, modalidade, faixa com graus e data, "treina connosco desde {data}", presenças nos últimos 30 dias, último check-in, próximas 3 aulas.

## 5. Capabilities

Ordered by build sequence (§11).

- [ ] New Supabase project schema: migrations 001–002 (existing) + `003_dlbjj_alunos.sql` (students, belts, classes, attendance, tokens, opt-outs, queue, touches, budget, session, rate limits, questions) + RPCs for queue claim/finish. All idempotent.
- [ ] `scripts/seed-turmas.ts`: upserts `dlbjj_turmas` from `content/site.ts` (parses `dias` strings into weekday arrays). Run on every deploy via `npm run seed:turmas`.
- [ ] Outbound queue replaces direct sending: `sendOutbound()` writes `dlbjj_mensagens` + `dlbjj_fila_saida`; `lib/messaging/{whatsapp,templates,provider,simulator}.ts` and `app/api/whatsapp/webhook/route.ts` deleted; `hasWhatsApp()` deleted; `WHATSAPP_*` env removed.
- [ ] Numbered-option renderer and resolver (§4.0).
- [ ] `POST /api/agent/inbound` (worker → app) with `x-dlbjj-token`.
- [ ] Opt-out matcher (deterministic) and `dlbjj_opt_outs`.
- [ ] Check-in: keyword matcher, class-of-the-day resolver, sibling disambiguation, attendance insert, inactive → active flip.
- [ ] Profile keyword → magic link.
- [ ] Worker (`worker/`): config, HMAC-verified webhook server, delivery dedupe, normaliser, filters (groups, status broadcasts, own echoes), forward-to-app with dead-letter, handoff detection, drainer with leases/gates/typing/backoff, heartbeat, graceful shutdown, Dockerfile.
- [ ] `docker/docker-compose.yml` (gateway + worker) and `docker/README.md` runbook in pt-PT.
- [ ] Fake gateway (`worker/test/fake-gateway.ts`) implementing the endpoints the transport uses and emitting signed webhooks.
- [ ] Enrolment: panel button, token issue, public form, validation, student + belt creation, lead linking, confirmation message.
- [ ] Panel: `/painel/alunos`, `/painel/alunos/novo`, `/painel/alunos/[id]` (graduations, presences, edit, anonymise, profile link), `/painel/aulas`, `/painel/aulas/[turmaId]`.
- [ ] Reactivation: rules R1–R5, `GET /api/cron/reativacao`, `vercel.json` crons, `/painel/reativacao`.
- [ ] Ask-the-data: tool catalogue, two-call LLM pattern, `/painel/perguntar`, `dlbjj_perguntas` log.
- [ ] `/painel/agente`: kill switch, session card, failed inbound list, `desconhecido` rows.
- [ ] Anonymisation: `GET /api/cron/anonimizar` monthly + manual action.
- [ ] Rate limiting on `/painel/login`, `/inscricao/*`, `/aluno/*` (DB-backed counters).
- [ ] Tests (§12) and `npm run verify`.
- [ ] Docs: rewrite `AGENTE-WHATSAPP.md`, `docs/PRE-VOO.md`, `README.md` section, `.env.example`, `docker/README.md`.

### 5.1 Reactivation rules (evaluated hourly by the app; sent by the worker)

| Rule | Who | When | Text (first name only; two variants each, chosen at random) |
|---|---|---|---|
| R1 | lead `status in (novo, em_progresso)`, not paused, no `aluno_id` | `last_message_at` older than 24 h, no R1 touch | "Olá {nome}! Ficou a faltar pouco para marcares a tua aula grátis na DL-BJJ. Queres continuar? Responde *sim* e retomamos onde ficámos. 🥋" |
| R2 | same as R1 | older than 72 h, R1 sent, no R2 touch | "Olá {nome}, só para não ficar esquecido: a primeira aula é grátis e sem compromisso. Diz-me *sim* e marco já. Se preferires que não insista, diz *parar*." |
| — | same as R1 | older than 7 days, R2 sent | no message; set lead `status = perdido` |
| R3 | lead `status = concluido`, no `aluno_id`, no presença | `updated_at` older than 10 days, no R3 touch | "Olá {nome}! Correu bem a tua ida à DL-BJJ? Se ainda não deu para ir, diz-me um dia que te dê jeito e marcamos de novo. 🙂" |
| R4 | aluno `status = ativo` | no presença in 14 days (or since `inicio_em` if never), no R4 touch in the last 30 days | "Olá {nome}! Há umas semanas que não te vemos no tatame. Está tudo bem? As aulas de {turma} continuam {dias} às {horario}. Oss 🥋" |
| R5 | aluno `status = ativo` | no presença in 30 days, R4 sent ≥ 14 days ago, no R5 touch in the last 90 days | "Olá {nome}, o tatame sente a tua falta. 🙂 Se quiseres voltar, basta apareceres — ou diz-me se preferires que não insista." then set `status = inativo` |

A reply from the person within 7 days of a touch sets `dlbjj_toques.respondeu_em`. `{turma}/{dias}/{horario}` come from the student's `turma_preferida` or, if null, the first class at their academy for their modality. Names: first token of `nome`.

### 5.2 Opt-out matcher

Normalise (lowercase, strip accents). Match any of: `parar`, `para de`, `pára`, `nao quero`, `nao me mandes`, `nao me mandem`, `nao enviem`, `remover`, `remove-me`, `stop`, `cancelar mensagens`, `deixa-me em paz`, `deixem-me em paz`. Runs **before** the state machine and before any LLM call, on every inbound text. Does not fire inside Journey A's `nome` step when the text is longer than 40 characters (a name is never that long; a sentence containing "parar" might be a question).

### 5.3 Check-in and profile keywords

Check-in: `presente`, `cheguei`, `check-in`, `checkin`, `check in`, `estou aqui`, `to aqui`, `tou aqui`, `vou treinar`, `treinei`, `presença`. Profile: `perfil`, `a minha ficha`, `minha ficha`, `a minha faixa`, `minha faixa`. Exact token match after normalisation, or the message equals one of them plus punctuation/emoji. These run after the opt-out matcher and before the state machine, **even when the lead is paused** (§6.5).

### 5.4 Ask-the-data tool catalogue (read-only; the only queries the chat can run)

| Tool | Arguments | Returns |
|---|---|---|
| `contar_alunos` | academia?, estado?, modalidade?, publico? | count |
| `listar_alunos` | academia?, estado?, faixa?, limite (≤ 50) | nome, academia, faixa, graus, último check-in |
| `ficha_aluno` | nome (fuzzy, `ilike`), returns up to 5 candidates when ambiguous | nome, academia, modalidade, faixa + graus + data, inicio_em, estado, último check-in, presenças 30 d |
| `historico_faixas` | nome | rows of `dlbjj_graduacoes` |
| `presencas_por_turma` | dias (30/90/365) | ranking: turma, local, presenças, alunos distintos |
| `presencas_aluno` | nome, dias | dates + turma |
| `alunos_em_risco` | dias (default 14) | students with no presença in N days |
| `leads_por_estado` | dias | counts per status |
| `leads_por_origem` | dias | counts per origem |
| `proximas_aulas` | academia? | next 5 classes from now |

**Never returned by any tool:** guardian fields, health notes, emergency contact, NIF, address, email, phone. The LLM sees only what the tool returns.

## 6. Invariants — enforce on the server

1. **One outbox, one consumer.** Every message to a human is a row in `dlbjj_fila_saida`, and only the worker's drainer calls the gateway. App code has no HTTP client for the gateway (there is no `lib/messaging/openwa.ts` in the app; grep must find `send-text` only under `worker/`). Reason: ARwatches §2.6 — with one send path, the window, the ceiling, the opt-out and the kill switch apply in one place.
2. **Opt-out is final and checked at send time.** `dlbjj_opt_outs.phone_hash` (sha256 of digits) is consulted by `dlbjj_reclamar_fila` **and** by the worker gate before every `kind = proativa` send. Enqueuing is also refused (`POST` returns 409 `opt_out`), but the send-time check is the invariant; the enqueue check is a courtesy. Anonymisation never deletes this table.
3. **Proactive traffic is bounded.** `kind = proativa` rows leave only between 09:00 and 21:00 Europe/Lisbon **at send time** and only while `dlbjj_orcamento_envio(dia).proativas < settings.proativas_por_dia` (default 10). `kind in (resposta, sistema, humano)` is never counted or windowed. Reason: ARwatches §13 — cold outbound is what bans numbers; replies protect the received/sent ratio.
4. **Kill switch cancels, never holds.** When `dlbjj_settings.bot_enabled = off`: `handleInbound()` logs the inbound and returns without replying (check-ins are still recorded, silently); the drainer marks every pending `proativa`/`resposta`/`sistema` row `cancelada` with `erro = "interruptor desligado"`; `kind = humano` (Daniel from the panel) still goes out.
5. **Human handoff silences the bot, except for utilities.** While `paused = true` or `humano_ate > now()`, the state machine does not run and no LLM is called. Check-in and profile keywords (§5.3) and the opt-out matcher still run, because they are deterministic record-keeping, not conversation. Auto-resume at `humano_ate`; manual resume via the panel.
6. **Inbound is idempotent; outbound is never auto-retried after a timeout.** `dlbjj_mensagens.wa_message_id` is a **non-partial** unique index (never add `where … is not null` — it breaks `on conflict`, ARwatches HANDOFF §11). A send whose HTTP call timed out is marked `desconhecido` and left for a human; only 429/5xx/network errors before a response are retried, with backoff [30 s, 5 min, 30 min], max 4 attempts.
7. **Belt history is append-only; attendance is unique.** `dlbjj_graduacoes` has no update/delete path in the app (RLS denies it even to the panel's actions; corrections are a new row with a note). `dlbjj_presencas` has `unique (aluno_id, turma_id, data)`; a duplicate check-in is answered "Já tinhas a presença registada hoje. 🙂" and inserts nothing.
8. **The LLM never invents facts.** It (a) maps free text to an existing option id, (b) answers from the `FACTOS` block built from `content/site.ts`, (c) chooses a tool and arguments from §5.4, (d) phrases rows it was given. Prices, belts, dates, schedules in any answer must originate from `content/site.ts` or from a tool result. Enforced by: option ids validated against the step's options; tool names validated against the catalogue; the formatting call receives rows and is told "não acrescentes números que não estejam nas linhas"; the existing "pergunta-preco" scenario stays in the e2e suite.
9. **Minors need a guardian.** The enrolment server action rejects (422) any student whose birth date makes them under 18 on submission day unless `enc_nome`, `enc_telefone`, `enc_relacao` and `consentimento_rgpd` are present. RGPD consent is required for everyone; image consent is optional.
10. **Tokens are hashed, scoped and expiring.** `dlbjj_tokens` stores `sha256(token)`, `kind`, `lead_id` or `aluno_id`, `expira_em`, `usado_em`. `inscricao` tokens are single-use (`usado_em` set in the same transaction as the student insert) and expire after 14 days; `perfil` tokens expire after 7 days and are reusable until then. A token of one kind never opens the other page. Issuing a new `inscricao` token revokes previous ones for the same lead.
11. **Nothing personal is hard-deleted.** Students and leads are anonymised (name → "Aluno anonimizado", phone → `anon:<sha256 prefix>`, guardian/health/contact fields → null, message bodies → "[anonimizado]") by an explicit panel action or by the monthly cron for records whose `last_message_at`/last presence is older than 24 months and whose status is not `ativo`. Opt-out hashes survive. `dlbjj_graduacoes` and `dlbjj_presencas` rows survive (they are not personal once the student is anonymised).
12. **Worker calls are authenticated both ways.** Worker → app: header `x-dlbjj-token` equal to `DLBJJ_WORKER_TOKEN`, compared with `timingSafeEqual`; missing or wrong → 401 and nothing processed. Gateway → worker: `X-OpenWA-Signature: sha256=<hex>` HMAC over the raw body with `OPENWA_WEBHOOK_SECRET`, verified before `JSON.parse`. App → anything: the app never calls the worker.
13. **The two forbidden gateway calls do not exist.** `worker/src/transport/openwa.ts` has no method for presence subscription/query or contact enumeration (`/presence/*`, `/contacts` list). `checkNumber` (single number, immediately before a first send to it) is the only lookup. Reason: ARwatches §7, those calls are detection signatures.
14. **Fail closed in production.** In production (`isProduction()`), missing `DASHBOARD_PASSWORD` closes `/painel`; missing `DLBJJ_WORKER_TOKEN` makes `/api/agent/inbound` return 503; missing `CRON_SECRET` makes `/api/cron/*` return 503; `/api/sim/*` return 404 unless `x-sim-secret` matches `CRON_SECRET`.

## 7. Data model and lifecycle

Schema is yours to design within these constraints. Table and column names below are fixed where given. All `timestamptz`. Phones are digits only.

### `dlbjj_leads` (exists; extend)
- **Represents:** a phone number that wrote to the academy; both CRM card and conversation state.
- **Owned by:** the engine; Daniel edits status.
- **States:** `novo → em_progresso → concluido → inscrito`; side exits `humano` (paused), `perdido` (R2 ran out), `descartado` (manual). Add `aluno_id uuid references dlbjj_alunos`, `humano_ate timestamptz`, `ultima_regra text`, `respondeu_regra_em`.
- **Reversible:** `humano` → `em_progresso` (resume); `perdido` → `em_progresso` when the person writes again (the engine reopens at the current step).
- **Never silently deleted:** anonymised only (§6.11).

### `dlbjj_mensagens` (exists; extend)
- Append-only log. Add `fila_id uuid` (link to the queue row), `entregue_em`, `lido_em` (from `message.ack`), `estado text check in (na_fila, enviada, entregue, lida, falhou, desconhecido, cancelada)` for `direction = out`.

### `dlbjj_alunos`
- **Represents:** an enrolled student. `phone` is the WhatsApp contact for this student (the guardian's phone for a child; several students may share a phone; **no unique index on phone**).
- **Fields (fixed names):** `nome`, `data_nascimento`, `phone`, `email`, `morada`, `nif` (validated with the Portuguese check digit when present), `publico` (`kids|adulto`, derived from age at enrolment), `modalidade`, `local_slug`, `turma_preferida` (fk `dlbjj_turmas`), `experiencia_previa text`, `enc_nome`, `enc_telefone`, `enc_relacao`, `contacto_emergencia_nome`, `contacto_emergencia_telefone`, `condicoes_saude text`, `consentimento_rgpd_em`, `consentimento_imagem bool`, `inicio_em date`, `estado text check in (ativo, inativo, ex_aluno, anonimizado)`, `notas text`, `lead_id`, `created_at`, `updated_at`.
- **States:** `ativo → inativo` (R5 or manual) `→ ativo` (any check-in, automatic) ; `→ ex_aluno` (manual only) ; `→ anonimizado` (terminal).
- **Never silently deleted:** anonymised only.

### `dlbjj_graduacoes`
- **Represents:** one belt/stripe award. `aluno_id`, `faixa text check in (branca, cinzenta, amarela, laranja, verde, azul, roxa, castanha, preta)`, `graus int check 0..4`, `atribuida_em date`, `nota text`, `created_at`. Current belt = latest `atribuida_em`, then `created_at`.
- **Append-only** (§6.7). The enrolment form creates the first row.

### `dlbjj_turmas`
- **Represents:** a recurring class from `content/site.ts`. `chave text unique` = `${local_slug}|${turma}|${dias}|${horario}`, `local_slug`, `turma`, `dias` (verbatim), `dias_semana int[]` (1 = Monday … 7 = Sunday), `horario time`, `tipo`, `ativa bool`. Seeded by `scripts/seed-turmas.ts`; classes missing from `site.ts` are set `ativa = false`, never deleted (attendance references them).

### `dlbjj_presencas`
- `aluno_id`, `turma_id`, `data date`, `origem text check in (whatsapp, painel)`, `created_at`; `unique (aluno_id, turma_id, data)`. Permanent.

### `dlbjj_fila_saida` (the outbox)
- `id`, `phone`, `lead_id?`, `aluno_id?`, `kind text check in (resposta, sistema, proativa, humano)`, `regra text?`, `corpo text`, `estado text check in (pendente, a_enviar, enviada, falhou, cancelada, desconhecido)`, `enviar_apos`, `tentativas int`, `erro text?`, `locked_by text?`, `locked_at?`, `envio_iniciado_em?`, `wa_message_id?`, `mensagem_id` (fk `dlbjj_mensagens`), `created_at`, `updated_at`.
- RPC `dlbjj_reclamar_fila(p_worker text, p_agora timestamptz, p_ttl interval) returns setof dlbjj_fila_saida`: claims up to 5 rows ordered by `enviar_apos` where `estado = pendente and enviar_apos <= p_agora and (locked_at is null or locked_at < p_agora - p_ttl) and envio_iniciado_em is null and phone not in opt-outs (for proativa)`, sets `estado = a_enviar, locked_by, locked_at`. RPC `dlbjj_terminar_fila(p_id, p_estado, p_wa_message_id, p_erro)` and `dlbjj_libertar_fila(p_worker)`.
- **States:** `pendente → a_enviar → enviada | falhou | desconhecido`; `pendente → cancelada` (opt-out, kill switch, Saltar). `falhou` with `tentativas < 4` and retryable error → back to `pendente` with `enviar_apos += backoff`. Rows older than 90 days may be deleted by the monthly cron (not personal beyond phone, which anonymisation already replaced).

### `dlbjj_toques`
- One row per reactivation message: `phone`, `lead_id?`, `aluno_id?`, `regra`, `fila_id`, `estado check in (na_fila, enviada, falhou, saltada)`, `enviada_em?`, `respondeu_em?`, `created_at`. Permanent (it is the proof that we did not over-contact someone).

### `dlbjj_opt_outs`
- `phone_hash text primary key`, `motivo text`, `created_at`. **Never deleted, never anonymised away.**

### `dlbjj_tokens`
- `token_hash text primary key`, `kind check in (inscricao, perfil)`, `lead_id?`, `aluno_id?`, `expira_em`, `usado_em?`, `revogado_em?`, `created_at`.

### `dlbjj_orcamento_envio`
- `dia date primary key` (Lisbon date), `proativas int`, `respostas int`, `recebidas int`. Incremented by the worker.

### `dlbjj_sessao`
- Single row `id = 1`: `estado check in (ligado, instavel, caido)`, `detalhe`, `telefone`, `visto_em`, `restricao_ate?` (backpressure). Written by the worker heartbeat; read by `/painel/agente` and by the drainer gate.

### `dlbjj_entradas_falhadas`
- Dead letter for inbound deliveries the app did not accept: `delivery_id unique`, `payload jsonb`, `tentativas`, `proxima_em`, `erro`, `created_at`.

### `dlbjj_limites`
- `chave text primary key` (`${rota}:${ip}:${janela}`), `contagem int`, `expira_em`. Used by `/painel/login` (5 / 15 min), `/inscricao/*` and `/aluno/*` (10 / min).

### `dlbjj_perguntas`
- `pergunta`, `ferramenta?`, `argumentos jsonb?`, `linhas int`, `resposta`, `duracao_ms`, `created_at`. Retained 12 months.

### `dlbjj_settings` (exists; add keys)
`bot_enabled` (on/off), `proativas_por_dia` (10), `janela_inicio` (09:00), `janela_fim` (21:00), `resposta_atraso_media_s` (8), `resposta_atraso_desvio_s` (3), `proativa_intervalo_medio_s` (240), `proativa_intervalo_desvio_s` (90), `digitar_wpm` (40), `humano_pausa_horas` (24), `inativo_dias` (30), `r4_dias` (14). All read at use time, never cached longer than 60 s, so an operator can slow the number down without a deploy.

## 8. Users, auth and permissions

- **Daniel (single admin):** the existing shared-password login (`lib/auth.ts`: HMAC cookie, `assertAuthed()` in every server action). No user table, no roles. Every new server action and every `/painel/*` page calls `assertAuthed()`/`requireAuth()`. Add the login rate limit (§7, `dlbjj_limites`).
- **The worker (machine):** `x-dlbjj-token` on `POST /api/agent/inbound`; Supabase **service role** key for direct table access (queue, budget, session, handoff, dead letter). It never reads `dlbjj_alunos` health/guardian columns (it has no reason to; do not write code that does).
- **Vercel cron (machine):** `Authorization: Bearer ${CRON_SECRET}` on `/api/cron/*`, as Vercel sends it.
- **Students and leads:** never log in. They hold a token in a URL. The page resolves the token server-side; the browser receives rendered HTML and nothing else (no Supabase key, as today).
- **RLS:** keep migration 002's posture — no policy for `anon`/`authenticated` on any `dlbjj_` table; only the service role reads or writes. Add RLS that denies `update`/`delete` on `dlbjj_graduacoes`, `dlbjj_presencas`, `dlbjj_opt_outs`, `dlbjj_toques` to everyone **including** service role via a trigger that raises (service role bypasses RLS, so use a `before update or delete` trigger that raises unless a session setting `dlbjj.anonimizar = 'on'` is set by the anonymisation path).

## 9. Technical direction

- **Language / runtime:** TypeScript 5 (strict, as in `tsconfig.json`), Node **22** (installed: v22.23.2) for both app and worker.
- **Framework (app):** Next.js **16.2.10** as installed (App Router, server actions, `proxy.ts` if middleware is needed — read the docs). React 19.2, Tailwind 4. Do not upgrade Next or React.
- **Worker:** plain Node 22 with `node:http`, `zod`, `@supabase/supabase-js`; runtime `tsx` (no build step), `import type` only from `@/lib/*` (enforced by `verbatimModuleSyntax` and the esbuild resolution assertion in the Dockerfile, both copied from ARwatches). Lives at `worker/` in this repo with its own `package.json`.
- **Database:** Supabase Postgres, accessed with `@supabase/supabase-js` service-role client (`lib/supabase/service.ts`, exists) and plain SQL migrations. No ORM. Local: Supabase CLI (`supabase start`, `supabase db reset` applies `supabase/migrations/*`). Add `supabase/config.toml` and `supabase/seed.sql` (fixture leads/students for the e2e suite).
- **Rendering:** server components and server actions by default (as the panel does today). Client components only for the reply box, action buttons, checklist ticks and the chat input.
- **Background work:** (a) Vercel cron → `/api/cron/reativacao` (`0 8-20 * * *`, UTC) and `/api/cron/anonimizar` (`0 3 1 * *`), declared in `vercel.json`; (b) the worker's timers: drain every 15 s ± 20 %, heartbeat every 60 s, dead-letter retry every 60 s, stale-lease reclaim inside the claim RPC (TTL 10 min).
- **Time:** every "today", "09:00–21:00", weekday and `dia` computation uses `Europe/Lisbon` via `date-fns` + `@date-fns/tz` (add both). Never `new Date().getDay()` without a zone.
- **Hosting / deploy:** app on Vercel (project DLBJJ-lp, domain www.dlbjj.org; deploy from `main`); gateway + worker on the existing ARwatches VPS under `/opt/dlbjj` as Compose project `dlbjj`; **gateway port `127.0.0.1:2786`, worker port `4001`** (ARwatches holds 2785/4000); network `dlbjj-agent`; volume `dlbjj-openwa-data`.
- **Gateway container (fixed settings, copied from the ARwatches compose):** image `ghcr.io/rmyndharis/openwa:0.14.4` (pin by digest before go-live, as its compose explains); `ENGINE_TYPE=baileys`; `BAILEYS_MARK_ONLINE_ON_CONNECT=false` (the number must never sit permanently online); `BAILEYS_SYNC_FULL_HISTORY=false`; `RESOLVE_LID_TO_PHONE=true`; `AUTO_START_SESSIONS=true`; `API_MASTER_KEY=${OPENWA_API_KEY}`; `SESSION_DATA_PATH=/app/data/sessions` on the named volume; healthcheck `GET /api/health/ready`; `stop_grace_period: 45s`; json-file logging 10 MB × 5; ports `127.0.0.1:2786:2785`. `OPENWA_SESSION_ID` is the **UUID the gateway returns from `POST /api/sessions`**, not the name you gave it.
- **Package manager:** npm (this repo already has `package-lock.json`).
- **Delete:** `lib/messaging/whatsapp.ts`, `lib/messaging/templates.ts`, `lib/messaging/simulator.ts`, `lib/messaging/provider.ts`, `app/api/whatsapp/`, `hasWhatsApp()`, every `WHATSAPP_*` reference. Keep `app/api/sim/*` as the inbound injector for dev and e2e (it posts to `handleInbound()`; the outbox row is the "delivery").

### External integrations

| Integration | Used for | Timeout | Local fake |
|---|---|---|---|
| OpenWA gateway REST (`X-API-Key`, base `/api`, `/sessions/{id}/messages/send-text`, `/chats/typing`, `/chats/read`, `/contacts/check/{n}`, `/sessions/{id}`, `/sessions/{id}/qr`, `/sessions/{id}/pairing-code`, `/sessions/{id}/webhooks`) | sending, typing, read, session state, webhook registration | 15 s (sends 45 s) | `worker/test/fake-gateway.ts`: in-memory HTTP server on a random port; records sends; answers 201 `{messageId, timestamp}`; `POST /_fake/incoming` makes it emit a signed `message.received` webhook; `POST /_fake/echo` emits `message.sent` with a given id; `POST /_fake/session` sets the status it reports |
| OpenWA webhooks → worker (`X-OpenWA-Signature`) | inbound, acks, session events | n/a | same fake |
| Next.js app `POST /api/agent/inbound` (worker → app) | the brain | 25 s | in worker tests, a stub `node:http` server that records the body and returns 200 |
| Ollama Cloud (OpenAI-compatible, `OLLAMA_BASE_URL`, model `OLLAMA_MODEL`, default `gpt-oss:120b`) | free-text interpretation; tool choice + answer phrasing | 20 s, 1 retry on 5xx | `OLLAMA_FAKE=1` makes `lib/bot/nlu.ts` and `lib/perguntar/llm.ts` return canned results from `lib/llm/fake.ts` (a lookup table keyed by normalised input, with a default "needs_human = false, intent = outro"). All e2e tests run with the fake. |
| Supabase (local via CLI) | all data | 10 s | `supabase start` is the fake; nothing mocks Postgres |
| Vercel cron | scheduling | n/a | call the route with the bearer header from tests |

## 10. Security and privacy

- **Sensitive data:** names, phones, birth dates, NIF, addresses, emails, guardian contacts, emergency contacts, **health conditions of adults and minors**, image consent, and every conversation. Lives only in the dedicated Supabase project. Health, guardian and contact fields render on exactly one page (`/painel/alunos/[id]`) and in the enrolment form; they are never in lists, never in WhatsApp messages, never in `dlbjj_perguntas`, never in logs.
- **Sent to Ollama Cloud (non-EU, retention not confirmed):** during onboarding, the current message text, the lead's first name and the current step; for ask-the-data, Daniel's question and the rows a §5.4 tool returned (which exclude the fields above). Nothing else. **Write in `AGENTE-WHATSAPP.md` §"RGPD", in plain pt-PT, that names, phone-adjacent text and conversation fragments leave the EU on every LLM call, that Daniel (the controller) must be told before go-live, and that the alternatives are a self-hosted model or a provider with a written zero-retention commitment.**
- **Never leaves the VPS:** the WhatsApp session credentials (gateway volume), `OPENWA_API_KEY`, `OPENWA_WEBHOOK_SECRET`. The gateway listens on loopback only; nothing public reaches it. The panel does not proxy to the gateway (pairing is done in the VPS terminal per the runbook).
- **Secrets:** server-side only; `NEXT_PUBLIC_*` is limited to the Supabase URL and anon key, which no browser code uses (keep it that way; `grep -r supabase components app` must hit only server files).
- **Retention and deletion:** active students and their conversations are kept while `estado = ativo`. 24 months after the last message or presence (whichever is later) for leads and non-active students, the monthly cron anonymises (§6.11). `dlbjj_perguntas` 12 months, `dlbjj_fila_saida` 90 days, `dlbjj_limites` on expiry. Manual "Anonimizar" on the student page does the same immediately. Opt-out hashes are permanent.
- **Riskiest surfaces and their guardrails:**
  - `POST /api/agent/inbound`: shared token, timing-safe; body validated with zod; `text` capped at 4,000 chars; 503 when the token is unset in production.
  - Worker webhook: HMAC over raw bytes before parse; body cap 2 MB; dedupe by `deliveryId`; events outside the subscribed list ignored.
  - `/inscricao/[token]` and `/aluno/[token]`: tokens ≥ 32 random bytes base64url, hashed at rest, expiring; rate limit 10/min/IP; all inputs validated server-side with zod; no file uploads anywhere.
  - `/painel/login`: existing timing-safe compare + 5 attempts / 15 min / IP.
  - `/api/cron/*`: bearer `CRON_SECRET`; idempotent (running twice in an hour enqueues nothing extra, because touches are checked).
  - `/api/sim/*`: 404 in production without `x-sim-secret` (exists; keep).
  - Logs: redact phones to `351…266` form in worker logs (copy `redactChatId` from ARwatches); never log message bodies at `info`.

## 11. Build order

Each step ends with something runnable and a test that proves it. Do not start the next step with the previous one red.

1. **Database foundation.** `supabase init`/`config.toml`, make 001+002 run on a fresh local DB, write `003_dlbjj_alunos.sql` with every table and RPC in §7, `seed.sql` fixtures (3 leads at different steps, 4 students across the three academies incl. two siblings on one phone, belts, 20 presences), `scripts/seed-turmas.ts` with its `dias` parser and a unit test for every `dias` string in `content/site.ts`.
2. **Outbox instead of transport.** Rewrite `lib/bot/outbound.ts` so `sendOutbound()` inserts the message and a `dlbjj_fila_saida` row (`kind = resposta` from the engine, `humano` from the panel). Delete the Meta transport. Implement the numbered-option renderer/resolver. Journey A passes on `supabase start` via `/api/sim/scenario?nome=adulto-jj` with the assertion made on queue rows.
3. **Inbound endpoint and utilities.** `POST /api/agent/inbound`; opt-out matcher; check-in (with sibling and multi-class disambiguation); profile link; `humano_ate` auto-resume. Journeys C, C′, D′, F, F′ pass as e2e tests through `/api/sim/inject`.
4. **Worker.** Config, webhook server, normaliser, filters, forward-to-app with dead letter, handoff registry, drainer (claim RPC, gates, read + typing + send, outcomes, backoff, `desconhecido`), heartbeat, shutdown. Fake gateway. Integration tests for the transport and the gates; the worker round-trip e2e (Journey H's happy half and Journey G).
5. **Docker.** `worker/Dockerfile`, `docker/docker-compose.yml`, `docker/.env.example`, `docker/README.md` runbook (pt-PT: máquina já preparada pela ARwatches; `git clone` para `/opt/dlbjj`; `.env`; `docker compose up -d openwa-api`; criar sessão; pairing code com `351925797266`; `up -d dlbjj-worker`; verificar). `docker compose config` must validate in CI.
6. **Enrolment.** Token issue action + button, public form, validation, student creation, confirmation message. Journeys B and B′.
7. **Student panel.** `/painel/alunos*`, graduations, manual presence, `/painel/aulas*`. Unit tests on "current belt" and the ranking query.
8. **Reactivation.** Rules R1–R5 as pure functions over rows (unit-tested with fixed clocks), cron route, `vercel.json`, `/painel/reativacao`, touches, reply detection. Journey D.
9. **Ask-the-data.** Tool catalogue as typed functions, two-call LLM wrapper with the fake, `/painel/perguntar`, log. Journeys E and E′.
10. **Agent page and anonymisation.** `/painel/agente`, `/api/cron/anonimizar`, manual anonymise, retention sweeps, rate limits.
11. **Verify and document.** `npm run verify`; rewrite `AGENTE-WHATSAPP.md`, `docs/PRE-VOO.md`, `README.md` (agent section), `.env.example`; fill §16.

## 12. Testing

Runner: **Vitest** (add it; alias `server-only` to an empty module in `vitest.config.ts`). Worker tests use the same runner from `worker/`. The e2e suite boots the app with `next dev --port 3100` against `supabase start` and `OLLAMA_FAKE=1`, resets the DB with `supabase db reset` first.

- **Unit (`tests/unit/`):** every §6 invariant that is expressible as a function (opt-out matcher; option resolver; `dias` parser; check-in class resolver with a fixed Lisbon clock incl. DST days 2026-03-29 and 2026-10-25; reactivation rules R1–R5 with fixed clocks; send-window and ceiling gates; backoff schedule; current-belt derivation; NIF check digit; minor detection; token hashing/expiry).
- **Integration (`tests/integration/`, `worker/test/`):** transport against the fake gateway (send → 201 → `rememberOurSend` before any await; timeout → `desconhecido`; 429 → retryable; 400 → `falhou`); webhook HMAC accept/reject; handoff registry (known id ignored, unknown id pauses the lead, restart-safe via DB lookup); claim RPC under two concurrent workers (one row, one winner); kill switch cancels pending rows; opt-out blocks at claim and at gate.
- **End-to-end (`tests/e2e/`), one per journey:** A (adulto-jj, kids), A′ (nogi kids → humano), B, B′, C (single, multi-class, siblings), C′, D (fixed clock, cron twice → one touch), D′, E, E′, F, F′, G (echo with unknown id), H (worker round-trip through fake gateway). Assertions are on database rows and rendered HTML strings quoted in §3/§4, never on screenshots.
- **Command to run everything:** `npm run verify` = `npm run typecheck && npm run lint && npm run seed:turmas:check && npm run test:unit && npm run test:integration && npm run test:e2e && (cd worker && npm run typecheck && npm test) && docker compose -f docker/docker-compose.yml config -q`.

## 13. Acceptance scenarios — your finish line

### AC-1 — Onboarding end to end (Journey A)
- **Given** a fresh DB, `OLLAMA_FAKE=1`, bot enabled
- **When** `/api/sim/scenario?nome=adulto-jj` runs with its 8 steps, using digits ("1", "1", "1", "1", "1", "1") instead of button ids
- **Then** `dlbjj_leads` has one row with `status = concluido`, `local_slug = queluz`, `turma = "Jiu-Jitsu (Adultos)"`, `horario = "08:00"`, `origem = instagram`; `dlbjj_fila_saida` has 8 rows `kind = resposta` (one per inbound step); the second row's `corpo` contains "1. Para mim" and "2. Para o/a filho/a"; no row contains "€".

### AC-2 — Opt-out is enforced at send time (Journey D′, §6.2)
- **Given** a lead with a pending `proativa` row and a worker running against the fake gateway
- **When** the lead's phone sends "não quero mais mensagens" via `/api/sim/inject`
- **Then** `dlbjj_opt_outs` has the phone hash; the pending row is `cancelada` with `erro = "opt-out"`; exactly one reply "Entendido, …" is queued and sent; a new `proativa` row inserted directly by SQL for that phone is never claimed (`dlbjj_reclamar_fila` returns nothing for it after 3 drain ticks) and the fake gateway recorded exactly one send to that phone.

### AC-3 — Handoff when Daniel types on his phone (Journey G, §6.5)
- **Given** a lead at step `horario` and the worker connected to the fake gateway
- **When** the fake emits `message.sent` for that chat with id `wamid.unknown-1` that the worker never produced
- **Then** within 2 s the lead has `paused = true`, `status = humano`, `human_reason = "Daniel respondeu pelo telemóvel"`, `humano_ate` ≈ now + 24 h; `dlbjj_mensagens` has an `out`/`humano` row; a subsequent inbound "1" from the lead produces **no** `resposta` row; an inbound "presente" from an enrolled sibling on that phone **does** insert a `dlbjj_presencas` row.

### AC-4 — Enrolment of a minor without guardian is rejected (§6.9)
- **Given** a valid `inscricao` token for a lead
- **When** the form is submitted with `data_nascimento = 2015-05-01` and empty guardian fields
- **Then** the response is 422 with the message "Para menores é obrigatório o encarregado de educação"; `dlbjj_alunos` is unchanged; the token's `usado_em` is still null; a second submission with guardian fields filled creates the student, one `dlbjj_graduacoes` row, sets the lead to `inscrito`, marks the token used, and queues the "Inscrição recebida" message with `kind = sistema`.

### AC-5 — Expired link renders nothing (Journey B′)
- **Given** an `inscricao` token with `expira_em` in the past
- **When** `GET /inscricao/<token>`
- **Then** HTTP 410, body contains "Este link já não é válido", body does not contain the lead's name or any `<form`.

### AC-6 — Check-in picks the right class and never duplicates (Journey C, §6.7)
- **Given** a student at `sao-bras`, modality `jiu-jitsu`, and the Lisbon clock fixed at Monday 2026-11-02 19:45
- **When** the phone sends "presente"
- **Then** the reply lists 4 numbered options (06:00, 11:00, 19:30, 20:30 Jiu-Jitsu); **when** "3" follows, a `dlbjj_presencas` row exists for the 19:30 class on 2026-11-02 with `origem = whatsapp`; **when** "presente" then "3" is sent again, no second row exists and the reply contains "Já tinhas a presença registada hoje".

### AC-7 — Reactivation respects window, ceiling and idempotency (§6.3, §5.1)
- **Given** 12 students with no presence for 15 days, clock fixed at 2026-11-03 10:00 Lisbon, `proativas_por_dia = 10`
- **When** `/api/cron/reativacao` is called twice and the worker drains for 30 fake-minutes
- **Then** exactly 12 `dlbjj_toques` rows exist for R4 (not 24), exactly 10 queue rows are `enviada`, 2 remain `pendente`; **when** the clock moves to 21:30 and the drainer ticks, the 2 are still `pendente` with no send; **when** the clock moves to the next day 09:05, they are sent.

### AC-8 — A timed-out send is never retried (§6.6)
- **Given** the fake gateway configured to hang on the next `send-text`
- **When** the drainer claims a `resposta` row
- **Then** after the 45 s timeout the row is `desconhecido`, `tentativas = 1`, and after three more drain ticks it is still `desconhecido` with one send attempt recorded by the fake; `/painel/agente` renders the row under "Envios desconhecidos".

### AC-9 — Ask-the-data refuses the unknown and hides the private (Journey E′, §5.4)
- **Given** seed students with health notes and guardian phones
- **When** Daniel asks "qual é a melhor estratégia de marketing?"
- **Then** the response equals the fixed refusal string in §3 E′ and `dlbjj_perguntas.ferramenta` is null; **when** he asks "mostra-me a ficha da Ana", the rendered answer and the logged `resposta` contain her belt and academy and do **not** contain the guardian phone, the health note or the NIF from the seed.

### AC-10 — Kill switch cancels instead of holding (§6.4)
- **Given** 3 pending `proativa` rows and 1 pending `humano` row
- **When** `bot_enabled` is set to `off` and the drainer ticks
- **Then** the 3 are `cancelada` with `erro = "interruptor desligado"`, the `humano` row is `enviada`; an inbound "Olá" from a new phone creates a lead and an `in` message but no `out` row.

### AC-11 — Fail closed in production (§6.14)
- **Given** `next build && NODE_ENV=production next start` with no env except Supabase
- **When** `POST /api/agent/inbound` with a valid body and no token; `GET /api/cron/reativacao` with no bearer; `POST /api/sim/inject`; `GET /painel`
- **Then** 503, 503, 404, 307 respectively, and no rows were written.

### AC-12 — Anonymisation keeps what must survive (§6.11)
- **Given** a student with belts, presences and an opt-out, last presence 25 months ago, `estado = inativo`
- **When** `/api/cron/anonimizar` runs
- **Then** `nome = "Aluno anonimizado"`, `phone` starts with `anon:`, health/guardian/contact fields are null, every `dlbjj_mensagens.body` for the old phone is "[anonimizado]", the `dlbjj_graduacoes` and `dlbjj_presencas` counts are unchanged, and `dlbjj_opt_outs` still has the original hash.

## 14. Failure recovery

- **Errors surface in:** structured JSON logs (`console.error` in the app → Vercel logs; `log.*` in the worker → Docker logs with rotation 10 MB × 5), **and** in the panel: `/painel/agente` lists session state, `desconhecido` sends, failed inbound deliveries and backpressure pauses; a failed outgoing message shows "falhou" on its bubble with the gateway error. Nothing is swallowed into a `catch {}` without a log line and, where a human must act, a panel row.
- **Background job retries:** worker → app forwarding: 3 attempts [30 s, 5 min, 30 min], then flagged. Queue sends: only on retryable errors before a response, [30 s, 5 min, 30 min], max 4, visible as `tentativas`/`erro` on the row. Timeouts: never retried (§6.6). Cron routes: idempotent, so Vercel's next hourly run is the retry.
- **Backpressure:** `session.restriction` → `dlbjj_sessao.restricao_ate = now + 60 min`, drainer sends nothing proactive until then, panel shows amber "O WhatsApp pediu para abrandar; envios proativos em pausa até {hora}". Three `message.failed` within 10 min → 15 min pause.
- **Migrations / rollback:** forward-only, idempotent SQL. Never drop a `dlbjj_` table or column in a migration; deprecate by leaving it unused. Rollback of the app is a Vercel redeploy of the previous commit, which must keep working against the newer schema (additive changes only).
- **Worker restart:** stale leases reclaimed after 10 min; rows with `envio_iniciado_em` set and no outcome become `desconhecido` on boot (never resent); webhook subscription rewritten on every boot.
- **Never do this:** retry a send after a timeout; silently drop an inbound because the app was down; let the bot keep talking after Daniel typed; send a proactive message outside the window because it was *queued* inside it.

## 15. Deliverables

- [ ] Working application, runnable locally with `supabase start && npm run dev` (simulator path via `/api/sim/*`, outbox visible on the panel) and the worker with `cd worker && npm run dev` against `worker/test/fake-gateway.ts`
- [ ] Database migrations `003_dlbjj_alunos.sql` (+ any later numbered files), `supabase/config.toml`, `supabase/seed.sql`
- [ ] `scripts/seed-turmas.ts` and `npm run seed:turmas`
- [ ] Seed data sufficient to demonstrate every journey in §3 on a clean `supabase db reset`
- [ ] `worker/` with Dockerfile; `docker/docker-compose.yml`; `docker/.env.example`; `docker/README.md` (pt-PT runbook: install under `/opt/dlbjj`, ports 2786/4001, project name `dlbjj`, create session, pairing code, verify, operate, rotate secrets, what to do on `session.restriction`)
- [ ] `vercel.json` with the two crons
- [ ] `.env.example` updated (app) — remove `WHATSAPP_*`, add `DLBJJ_WORKER_TOKEN`, `APP_BASE_URL`, `OLLAMA_FAKE`; `worker/.env.example`
- [ ] README section + rewritten `AGENTE-WHATSAPP.md` and `docs/PRE-VOO.md` describing the OpenWA architecture, the RGPD note (§10), and the manual steps that remain for Miguel: create the Supabase project and paste its three keys, set Vercel env, clone to the VPS, pair the number, tell Daniel about the LLM data flow
- [ ] The test suite from §12, passing via `npm run verify`
- [ ] The Decisions Log in §16, filled in

## 16. Decisions log

Append one line per decision you made that this spec did not settle, in the form:
`<what you decided> — <why, in one clause>`. Also record anything you deliberately did not build because §2 excluded it.

Pre-seeded (made during the interview):
- OpenWA/Baileys over Meta Cloud API — proactive messages days later without templates, and Daniel keeps his phone; ban risk accepted and documented.
- Same VPS as ARwatches, separate Compose project — cost; isolation by network/volume/ports/keys.
- Dedicated Supabase project — minors' health data must not share a service key with another client.
- Student-initiated check-in with no reminders — zero proactive traffic for attendance on an unofficial client.
- Fixed tool catalogue for ask-the-data — the LLM can never run SQL; private columns are structurally unreachable.
- Numbered text options instead of interactive buttons — Baileys does not deliver them reliably.
- Reactivation rules evaluated in the app by Vercel cron, sent by the worker — business rules stay in one runtime; the worker keeps only the clock and the socket.
- Check-ins accepted all day (00:00–23:59 Lisbon) rather than in a window around the class — fewer forks; a late "treinei hoje" still counts.

Made during the build (2026-10-19/20):
- `dlbjj_toques` allows UPDATE (estado, respondeu_em) and forbids only DELETE — §7 needs state transitions on touches; §8's "fully append-only" could not hold for that table.
- `dlbjj_reclamar_fila` also reclaims `a_enviar` rows whose lease is stale and whose send never started — otherwise a crashed worker wedged rows forever.
- A′ "no compatible class" is unreachable with the current `content/site.ts`; the A′ e2e covers the sensitive-question handoff instead.
- Opt-out matcher: "não quero" / "para de" count only with a messaging-context phrase; bare "parar"/"stop"/"remover" only as the whole message — the literal list made "não quero MMA" an opt-out mid-guião.
- `InboundMessage.agora` (ISO) is accepted only from `/api/sim/*` so e2e can fix the Lisbon clock; the worker never sets it.
- Siblings on one phone are listed by `inicio_em` then name.
- Bot off: opt-outs are still recorded (no reply); a check-in with exactly one possible class is recorded silently; multi-choice check-ins are dropped.
- A phone that already has students and writes a non-keyword message skips onboarding (lead → inscrito/concluido) and gets the grounded Q&A path.
- 410/404 for token pages live in `proxy.ts` + `/api/link-invalido` (App Router pages cannot set 410).
- An `@lid` sender with no gateway-resolved phone is logged and dropped; the app identifies people by phone only.
- Dead-letter key is the WhatsApp message id (redeliveries carry the same id).
- Backpressure (`restricao_ate`) holds proativas only; replies, system and human messages still go.
- Humanisation can be disabled with `WORKER_HUMANIZE=0` (tests only); production default on.
- Compose: `SERVE_DASHBOARD=false`, `BODY_SIZE_LIMIT=16mb` (text only).
- The enrolment form is an HTML string rendered by both the page and the 422 route — Next forbids `react-dom/server` in app code.
- The form posts to `POST /api/inscricao/<token>` (plain HTML form); the proxy gates the page, the route re-verifies the token.
- `inicio_em` = submission day (Lisbon); the first graduação is dated the same day with nota "inscrição".
- Panel mutations added in this build are POST route handlers under `/api/painel/*` behind `assertAuthed()` with plain forms and 303 back; the pre-existing server actions stay.
- Manual student creation sends no WhatsApp message.
- A mis-ticked presence cannot be removed (append-only); the checklist disables already-present rows.
- When R5 applies, R4 is not also sent in the same run.
- A reply within 7 days of a touch marks it answered and cancels any still-pending proativa for that phone.
- "Saltar" inserts a toque with estado `saltada`, which the rules treat as done.
- Cron routes: 401 without a matching bearer; 503 in production without `CRON_SECRET`.
- The ask-the-data chat is a form POST + redirect with the history read from `dlbjj_perguntas`; the 20 s cap is server-side.
- `ficha_aluno` privacy is enforced by explicit select lists in every tool; an integration test checks the returned keys.
- Login moved to `POST /api/painel/login` (same cookie) so the IP rate limit is testable end to end.
- The anonymisation cron also deletes closed queue rows > 90 days, questions > 12 months and expired limit counters.

Fixed after the whole-branch review (2026-10-20), each with a test that failed first:
- Enrolment token claimed atomically (conditional UPDATE) before the student is created; a double submit yields one student and 410 for the loser.
- Resuming a handed-off lead keeps `concluido`/`inscrito` instead of forcing `em_progresso` (a booked lead was becoming an R1 target and then `perdido`).
- Migration 004: `dlbjj_toques.fila_id` is `on delete set null` (90-day cleanup no longer blocked); touches can be `cancelada`; `dlbjj_terminar_fila(pendente)` clears `envio_iniciado_em`; the RPC also moves the touch to enviada/falhou/cancelada.
- Reply detection only marks SENT touches answered; pending proativas (and their touches) are cancelled instead; rules ignore cancelled/failed touches.
- A `message.sent` echo arriving before our `sendText` resolves is recognised as ours through the in-flight queue row (`a_enviar` + `envio_iniciado_em` + same text).
- An inbound whose processing fails after the idempotency row is written has that row deleted and the error re-thrown, so the worker's retry is not treated as a duplicate.
- Voice notes arrive as `[áudio]` and get "Não consigo ouvir áudios. Podes escrever por texto, por favor? 🙏" plus the current question, with no LLM call; photos/unsupported get "Só consigo ler texto. 🙂 Podes escrever?".
- Messages over 900 characters are split on blank lines into consecutive queue rows 3 s apart.
- `/painel`: status filter, name/phone search, "telemóvel" chip; `/painel/[phone]`: bubble state tags, "Marcar como perdido", inline send error.
- `POST /api/inscricao/<token>` is rate-limited (10/min/IP → 429).
- Phones are normalised to E.164 digits (a 9-digit Portuguese mobile gains 351; `00` prefix stripped); shorter numbers are refused with a message that asks for the indicative.
- A `perdido` lead that writes again reopens as `em_progresso` at its step.
- "Os dois / Todos" at check-in is offered only when the siblings share academy and public; otherwise one at a time.
- Any Vercel deployment (production or preview) counts as production for the fail-closed guards; the docs say Preview never gets the service key.
- Bare "cancelar", "basta", "chega" are no longer opt-outs (at the confirmation step "cancelar" is a booking cancellation).
- Worker counts and warns on discarded inbound payloads, shows the counter in `/health` and in the heartbeat detail (session goes `instavel`), and ignores a `message.received` carrying the id of one of our own sends.
- The anonymisation cron checks every delete for errors and answers 500 when one fails.

Deferred from the review as minor (recorded in the ledger, not fixed): `last_message_at` bumped by outbound sends (affects R2 timing and panel ordering); profile-link daily limit is per student rather than per phone; check-in/profile dialogue expiry uses wall clock rather than `agora`; `ilike` search strips `%_` but not `*`; `listar_alunos` applies `limite` before the `faixa` filter; the 20 s ask-the-data timer is not cancelled after a timeout; `editar`/`estado` panel routes ignore the update's error; `turma_preferida` not validated against `dlbjj_turmas` (FK error → generic 500); successful logins count toward the login limit; `message.failed` does not mark the message row; `cronAutorizado` lives in a route module; `decodeURIComponent` on a malformed token path throws 500; `resolve.ts` does not accept "1." / "1)" / two-digit replies; a second sibling enrolled through the same lead overwrites `dlbjj_leads.aluno_id`; touches keyed by phone give two silent siblings one R4; `worker/Dockerfile` uses `npm install` rather than `npm ci`; `tsconfig.json` carries a Next-generated `.next/dev/dev/types` include.

Not built because §2 excluded it: payments, Instagram, native app, capacity/booking, audio transcription, instructor roles, Cloud API fallback, write access from the chat.

**2026-10-20 — Área do aluno e painel novo.** Built after this spec, from its own design document: `docs/superpowers/specs/2026-10-20-area-do-aluno-design.md` (login by phone + WhatsApp code, 90-day sessions, Início/Histórico/Ranking/Calendário, events, the painel rebuilt on a shared shell with a dashboard and conversations under `/painel/mensagens`, migration `005`). The `perfil` link became single-use with a confirm page; §3 F's "ficha" is now that area. Everything else in this spec still holds.

**2026-10-20 — Ajustes do painel após o primeiro teste.** `docs/superpowers/specs/2026-10-20-painel-ajustes-design.md`: Início sem o cartão do agente (o sino acende com batimento parado), conversa ao centro com painel lateral e resumo pelo modelo (tabela `dlbjj_resumos`, migração `006`), aulas por espaço com horário semanal, eventos em calendário com modal e feed ICS privado, Perguntar desligado (catálogo mantido).

## 17. Definition of Done

> `npm run verify` exits 0 on a clean checkout with `supabase start` running and no network access to Ollama or WhatsApp (fakes only); every scenario AC-1 to AC-12 in §13 passes inside that run; `docker compose -f docker/docker-compose.yml config` validates and the runbook's steps are the only thing between a fresh clone on the VPS and a `ready` session; and the only remaining manual steps, listed at the top of `AGENTE-WHATSAPP.md`, are creating the Supabase project, pasting env values into Vercel and `docker/.env`, and reading the pairing code on Daniel's phone.
