# Plano — Agente OpenWA, inscrições, check-in, reativação, painel

**Spec:** `dlbjj-build-spec.md` (repo root). The spec is the authority; this plan is its build order (§11) made executable. Every task names the spec sections it implements. Read the brief, then the named sections, before coding.

## Global constraints

- Branch `agente-openwa`. Commit per task (or more). Never push.
- TDD on every behaviour (superpowers:test-driven-development). Runner: Vitest for app and worker.
- Local DB: `supabase start` (CLI 2.75) on this machine; Docker runtime must be up. App e2e runs on port **3100**. Port 3000 and 5432 are taken by unrelated local services.
- `OLLAMA_FAKE=1` in every test. No network to Ollama or WhatsApp in `npm run verify`.
- pt-PT copy, `dlbjj_` tables, fail closed in production (spec §0.2, §6.14).
- Keep `lib/bot/flow.ts` option ids and texts; keep `lib/auth.ts`; keep `app/api/sim/*` as the inbound injector.

## Review Focus

Inputs the tests do not exercise deliberately: real gateway payload drift (OpenWA > 0.14.4), DST edge at 01:00–02:00 on transition nights, a phone that is both a lead and a guardian of two students, Portuguese text with mixed accents/emoji in option titles, concurrent webhook deliveries for the same `wa_message_id`, a `message.sent` echo arriving before the app has written the outbound row.

---

### Task 1: Database foundation (spec §7, §11.1)

**Produces:** `supabase/config.toml`, `supabase/migrations/003_dlbjj_alunos.sql` (all §7 tables, RPCs `dlbjj_reclamar_fila`, `dlbjj_terminar_fila`, `dlbjj_libertar_fila`, append-only triggers), `supabase/seed.sql`, `scripts/seed-turmas.ts` + `lib/turmas/dias.ts` (parser `dias` → weekday ints), `npm run seed:turmas`, Vitest wired (`vitest.config.ts`, alias `server-only` → empty), `tests/helpers/db.ts` (service client to local Supabase, `resetDb()`).

Steps:
1. `supabase init` (accept defaults; do not generate IDE settings). `supabase start` → Expected: prints API URL `http://127.0.0.1:54321`, DB `54322`, service_role key. Write `.env.test` with those values + `OLLAMA_FAKE=1`, `DASHBOARD_PASSWORD=teste`, `DLBJJ_WORKER_TOKEN=teste-worker`, `CRON_SECRET=teste-cron`, `APP_BASE_URL=http://localhost:3100`.
2. Install `vitest`, `date-fns`, `@date-fns/tz`, `tsx`, `dotenv`. Add scripts: `test:unit`, `test:integration`, `test:e2e`, `seed:turmas`, `seed:turmas:check`, `verify`.
3. RED: `tests/unit/dias.test.ts` — every `dias` string in `content/site.ts` maps to the expected weekday array ("Terça e Quinta" → [2,4]; "Segunda, Quarta e Sexta" → [1,3,5]; "Sábado" → [6]; "Sexta-feira" → [5]; "Segunda e Quarta" → [1,3]). Run → Expected: FAIL (module missing).
4. GREEN: `lib/turmas/dias.ts`.
5. Write `003_dlbjj_alunos.sql` per spec §7 (tables, checks, unique indexes, RPCs, triggers, settings keys). `supabase db reset` → Expected: applies 001, 002, 003 and seed with no error.
6. RED: `tests/integration/schema.test.ts` — (a) inserting two `dlbjj_presencas` for same aluno/turma/data fails with 23505; (b) `update dlbjj_graduacoes` raises; (c) `dlbjj_reclamar_fila` with two callers on one pending row returns it to exactly one; (d) a pending `proativa` row for an opted-out phone is never returned. Run → Expected: FAIL until SQL is right; then PASS.
7. `scripts/seed-turmas.ts`: upsert `dlbjj_turmas` from `content/site.ts` by `chave`; mark absent as `ativa=false`. `npm run seed:turmas` → Expected: "14 turmas" (3 Queluz + 8 São Brás + 3 Kids). `npm run seed:turmas:check` exits 0 when DB matches site.ts.
8. `supabase/seed.sql`: fixtures per spec §11.1 (3 leads, 4 students incl. siblings on one phone, belts, 20 presences, one opt-out). Note: seed.sql runs before `seed-turmas`; make the presence fixtures reference turmas by `chave` via a small `insert … select` so order does not matter, or have seed.sql insert the turmas itself with the same `chave` values.
9. Commit: `BD: tabelas de alunos, fila de saída e RPCs (003) + seed`.

Test command for the task: `npx vitest run tests/unit/dias.test.ts tests/integration/schema.test.ts`

### Task 2: Outbox replaces the transport; numbered options (spec §4.0, §6.1, §9 "Delete", §11.2)

**Produces:** `lib/bot/outbound.ts` writing `dlbjj_mensagens` + `dlbjj_fila_saida`; `lib/bot/render.ts` (`renderOptions`), `lib/bot/resolve.ts` (`resolveOptionText`); `lib/messaging/*` and `app/api/whatsapp/` deleted; `lib/config.ts` without `WHATSAPP`/`hasWhatsApp`; `lib/sim-guard.ts` updated (allowed when `!isProduction()` or `x-sim-secret` matches); `lib/llm/fake.ts` + `OLLAMA_FAKE` branch in `lib/bot/nlu.ts`; `tests/helpers/app.ts` (boot `next dev -p 3100` with `.env.test`, wait for `/api/sim/inject` 400, stop).

Steps:
1. RED `tests/unit/render.test.ts`: `renderOptions("A inscrição é para ti ou para um/a filho/a?", publicoOptions())` equals the exact block in spec §4.0; no options → text only, no hint; 9+ options → first 9 only. Expected: FAIL.
2. GREEN `lib/bot/render.ts`.
3. RED `tests/unit/resolve.test.ts`: "2" → `pub:kids`; "para o filho" → `pub:kids` (accent/case-insensitive title match on normalised prefix); "Jiu-Jitsu" → `mod:jiu-jitsu`; "7" with 3 options → null; "talvez" → null. Expected: FAIL.
4. GREEN `lib/bot/resolve.ts`; wire into `resolvePick` in `handle-inbound.ts` before `interpret()`.
5. Delete transport files, `WHATSAPP_*` env, `hasWhatsApp()`; rewrite `sendOutbound()`/`deliver()` to insert the message (`direction=out`, `estado=na_fila`) and one `dlbjj_fila_saida` row (`kind` from the caller: `resposta` for bot, `humano` for panel). `npm run typecheck && npm run lint` → Expected: exit 0.
6. `lib/llm/fake.ts`: table keyed by normalised text: "quanto custa a mensalidade?" → `{intent:"pergunta", answer:"A primeira aula é grátis; o Daniel confirma os valores diretamente contigo. 🙂"}`; "o meu filho tem autismo…" → `{needs_human:true, human_reason:"questão sensível"}`; default → `{intent:"outro", confidence:0}`. `nlu.ts` uses it when `OLLAMA_FAKE=1`.
7. RED `tests/e2e/onboarding.test.ts` (AC-1 + kids + pergunta-preco + nogi-kids → humano): boots app, resets DB, runs scenarios via `/api/sim/scenario` using digits, asserts on `dlbjj_leads` and `dlbjj_fila_saida`. Expected: FAIL (scenario route still sends button ids / outbox missing).
8. Update `app/api/sim/scenario/route.ts` scenarios to send digits ("1") where the spec says; GREEN.
9. Commit: `Fila de saída em vez de transporte; opções numeradas; Cloud API removida`.

Test command: `npx vitest run tests/unit/render.test.ts tests/unit/resolve.test.ts tests/e2e/onboarding.test.ts`

### Task 3: Inbound endpoint, opt-out, check-in, profile link, auto-resume (spec §3 C/C′/D′/F/F′/G, §5.2, §5.3, §6.2, §6.5, §6.7, §6.10, §6.12, §6.14)

**Produces:** `app/api/agent/inbound/route.ts`; `lib/bot/keywords.ts`; `lib/tempo.ts` (Lisbon helpers); `lib/bot/checkin.ts`; `lib/tokens.ts`; `lib/bot/perfil.ts`; `app/aluno/[token]/page.tsx`; `lib/limites.ts` (DB-backed rate limit); `handleInbound` order: logInbound → opt-out → keywords (even when paused) → auto-resume → paused? → bot_enabled → state machine.

Steps:
1. RED `tests/unit/keywords.test.ts` (opt-out list incl. accents/emoji; the 40-char rule at step `nome`; check-in and profile keyword lists; "presente!" and "Presente 🥋" match; "apresentei-me" does not). GREEN `lib/bot/keywords.ts`.
2. RED `tests/unit/tempo.test.ts`: `hojeLisboa(fixedUtc)` and `diaSemanaLisboa` on 2026-03-29T00:30Z (DST start day), 2026-10-25T00:30Z, 2026-11-02T19:45Z → Monday=1; `dentroDaJanela("09:00","21:00", instant)` at 08:59/09:00/20:59/21:00 Lisbon. GREEN `lib/tempo.ts`.
3. RED `tests/unit/checkin-resolver.test.ts` (pure): given turmas rows + student + clock → candidates per spec §3 C step 2 (modality match, fallback any class, none). GREEN `lib/bot/checkin.ts` (pure resolver + DB wrapper).
4. RED `tests/unit/tokens.test.ts`: create → 43-char base64url; hash stored; verify rejects expired, used (inscricao), wrong kind. GREEN `lib/tokens.ts`.
5. RED `tests/integration/inbound-route.test.ts`: no token → 401; wrong → 401; production without env → 503; valid → 200 and lead created. GREEN route.
6. RED `tests/e2e/checkin.test.ts` (AC-6 single/multi/siblings/dup/no-class/not-a-student; inactive flips to active), `tests/e2e/optout.test.ts` (AC-2 app half: opt_out row, pending proativa cancelled, single reply), `tests/e2e/perfil.test.ts` (link issued, page renders belt, 3/day limit, expired → 410 without name), `tests/e2e/handoff-resume.test.ts` (lead with `humano_ate` in the past gets re-asked; in the future stays silent; check-in still recorded while paused). GREEN.
7. Commit: `Inbound do worker, opt-out, check-in, link de perfil`.

Test command: `npx vitest run tests/unit/keywords.test.ts tests/unit/tempo.test.ts tests/unit/checkin-resolver.test.ts tests/unit/tokens.test.ts tests/integration/inbound-route.test.ts tests/e2e/checkin.test.ts tests/e2e/optout.test.ts tests/e2e/perfil.test.ts tests/e2e/handoff-resume.test.ts`

### Task 4: Worker (spec §3 G/H, §6.1, §6.3, §6.4, §6.6, §6.12, §6.13, §9 integrations, §14)

**Produces:** `worker/` package (Node 22, tsx, zod, supabase-js, vitest): `src/config.ts`, `src/log.ts` (redact phones), `src/db.ts`, `src/transport/{types,openwa}.ts` (no presence/contacts-list methods), `src/inbound/{webhook,normalize,handoff,forward,deadletter}.ts`, `src/outbound/{drainer,gates,timing}.ts`, `src/scheduler/{tick,heartbeat}.ts`, `src/index.ts`; `worker/test/fake-gateway.ts`; `worker/.env.example`.

Steps (each RED→GREEN):
1. `test/transport.test.ts` against fake gateway: send-text → `{id}`; header `X-API-Key`; timeout → `GatewayError(retryable=true, timedOut=true)`; 429 → retryable; 400 → not; `qr()` on 400 → null; interface has no `subscribePresence`/`listContacts` (type-level assertion via `// @ts-expect-error`).
2. `test/webhook.test.ts`: bad HMAC → 401 and nothing processed; good → 200; duplicate `deliveryId` ignored; group/status/fromMe-known filtered.
3. `test/handoff.test.ts`: known id ignored; unknown id → lead paused with `humano_ate`; DB lookup backstop after registry cleared.
4. `test/gates.test.ts`: window, ceiling (reads `dlbjj_orcamento_envio`), opt-out, kill switch cancels `proativa`/`resposta`/`sistema` but sends `humano`, backpressure `restricao_ate`.
5. `test/drainer.test.ts`: claim → markRead (replies only) → typing → send → `enviada` + `wa_message_id` on `dlbjj_mensagens`; timeout → `desconhecido` and no retry (AC-8); retryable error → backoff schedule and `tentativas`; stale lease reclaim after TTL; shutdown releases leases.
6. `test/forward.test.ts`: app 200 → done; app down → dead letter row with `proxima_em`; retry schedule [30 s, 5 min, 30 min]; 3 failures → flagged.
7. `test/roundtrip.test.ts` (Journey H happy half + G): fake gateway → worker → stub app that enqueues a reply directly in DB → drainer sends → fake records; then echo with unknown id → lead paused (AC-3).
8. Heartbeat writes `dlbjj_sessao`; `index.ts` boot order per ARwatches; graceful shutdown.
9. Commit: `Worker: webhook, encaminhamento, drenagem da fila, passagem de mão, heartbeat`.

Test command: `cd worker && npx vitest run`

### Task 5: Docker (spec §9 hosting + gateway settings, §15)

**Produces:** `worker/Dockerfile`, `worker/.dockerignore`, `docker/docker-compose.yml` (project `dlbjj`, services `openwa-api` on `127.0.0.1:2786:2785` and `dlbjj-worker` port 4001, network `dlbjj-agent`, volume `dlbjj-openwa-data`), `docker/.env.example`, `docker/README.md` runbook pt-PT.

Steps:
1. Write files. `docker compose -f docker/docker-compose.yml --env-file docker/.env.example config -q` → Expected: exit 0 (with placeholder values present in `.env.example`; required ones use `:?` so the example must set dummy values).
2. If Docker is up: `docker build -t dlbjj-worker worker/` → Expected: builds; `docker run --rm dlbjj-worker node -e "console.log(1)"` → `1`. Ledger if Docker was unavailable.
3. Commit: `Docker: gateway OpenWA + worker, runbook`.

Test command: `docker compose -f docker/docker-compose.yml --env-file docker/.env.example config -q`

### Task 6: Enrolment (spec §3 B/B′, §4 form page, §6.9, §6.10, §11.6)

**Produces:** server action `enviarInscricao(phone)` + button on `/painel/[phone]`; `app/inscricao/[token]/page.tsx` + server action `submeterInscricao`; `lib/inscricao/{validar,criar}.ts` (zod schema, NIF check digit, minor rule); confirmation message `kind=sistema`.

Steps:
1. RED `tests/unit/inscricao-validar.test.ts` (NIF valid/invalid; minor without guardian → error string; adult without guardian ok; RGPD required). GREEN.
2. RED `tests/e2e/inscricao.test.ts` (AC-4, AC-5; token revocation when re-issued; lead → inscrito; first graduação; `kind=sistema` row). GREEN.
3. Commit: `Inscrição: link, formulário público, criação do aluno`.

Test command: `npx vitest run tests/unit/inscricao-validar.test.ts tests/e2e/inscricao.test.ts`

### Task 7: Student and classes panel (spec §4 alunos/aulas pages, §6.7, §6.11 manual, §11.7)

**Produces:** `/painel/alunos`, `/painel/alunos/novo`, `/painel/alunos/[id]` (graduação, presença manual, editar, link de perfil, inativo/ex-aluno, anonimizar), `/painel/aulas`, `/painel/aulas/[turmaId]`; `lib/alunos/*` queries (`faixaAtual`, ranking).

Steps:
1. RED `tests/unit/faixa-atual.test.ts` (latest by `atribuida_em` then `created_at`). GREEN.
2. RED `tests/integration/ranking.test.ts` (presences per turma, distinct students, period). GREEN.
3. RED `tests/e2e/painel-alunos.test.ts`: pages require auth (307); list renders seed names; student page renders belt and guardian; list does not render guardian phone; registar graduação appends; manual presence unique; anonymise action (AC-12 manual half). GREEN.
4. Commit: `Painel: alunos, graduações, presenças, aulas`.

Test command: `npx vitest run tests/unit/faixa-atual.test.ts tests/integration/ranking.test.ts tests/e2e/painel-alunos.test.ts`

### Task 8: Reactivation (spec §5.1, §6.3, §3 D, §4 reativação page, §11.8)

**Produces:** `lib/reativacao/regras.ts` (pure), `lib/reativacao/executar.ts`, `app/api/cron/reativacao/route.ts`, `vercel.json`, `/painel/reativacao` (Saltar, Enviar agora, Correr regras agora, opt-outs, counter), reply detection (`respondeu_em`, `respondeu_regra_em`).

Steps:
1. RED `tests/unit/regras.test.ts` with fixed clocks for R1–R5 and the `perdido` transition; idempotency (touch exists → nothing). GREEN.
2. RED `tests/integration/cron-reativacao.test.ts` (AC-7 app half: 12 due → 12 toques after two runs; bearer required; 503 without secret in production). GREEN.
3. RED `tests/e2e/reativacao-painel.test.ts` (page lists due, Saltar records `saltada`, counter text "Enviadas hoje: 0 / 10"). GREEN.
4. Commit: `Reativação: regras R1–R5, cron, painel`.

Test command: `npx vitest run tests/unit/regras.test.ts tests/integration/cron-reativacao.test.ts tests/e2e/reativacao-painel.test.ts`

### Task 9: Ask-the-data (spec §5.4, §6.8, §3 E/E′, §4 perguntar page, §11.9)

**Produces:** `lib/perguntar/{ferramentas,llm,responder}.ts`, `app/painel/perguntar/page.tsx` + action, `dlbjj_perguntas` log; fake LLM entries for the test questions.

Steps:
1. RED `tests/unit/ferramentas.test.ts`: catalogue names fixed; `ficha_aluno` return type has no private keys (runtime assertion on seed row). GREEN.
2. RED `tests/e2e/perguntar.test.ts` (AC-9 both halves; tool name validation rejects "drop_tables"). GREEN.
3. Commit: `Perguntar: catálogo de ferramentas e chat do painel`.

Test command: `npx vitest run tests/unit/ferramentas.test.ts tests/e2e/perguntar.test.ts`

### Task 10: Agent page, anonymisation, rate limits, production gates (spec §4 agente page, §6.11, §6.14, §10, §11.10)

**Produces:** `/painel/agente` (kill switch, session card, failed inbound, `desconhecido` rows), `app/api/cron/anonimizar/route.ts` + `lib/anonimizar.ts`, `lib/limites.ts` applied to login/form/profile, production fail-closed checks.

Steps:
1. RED `tests/integration/anonimizar.test.ts` (AC-12). GREEN.
2. RED `tests/integration/limites.test.ts` (6th login attempt within 15 min → 429 text; window expiry). GREEN.
3. RED `tests/e2e/producao.test.ts` (AC-11 with `next build && next start` on 3101, no env except Supabase) and `tests/e2e/agente.test.ts` (switch off → AC-10 app half; page renders session card from a `dlbjj_sessao` row). GREEN.
4. Commit: `Painel do agente, anonimização, limites de pedidos, portas fechadas em produção`.

Test command: `npx vitest run tests/integration/anonimizar.test.ts tests/integration/limites.test.ts tests/e2e/agente.test.ts tests/e2e/producao.test.ts`

### Task 11: Verify and documents (spec §12, §15, §17)

**Produces:** `npm run verify` wired exactly as spec §12; `AGENTE-WHATSAPP.md`, `docs/PRE-VOO.md`, `README.md` agent section, `.env.example`, `worker/.env.example`, `docker/README.md` final; spec §16 filled from the ledger.

Steps:
1. `npm run verify` → Expected: exit 0; read the tail of every suite.
2. Rewrite docs. `grep -rn "WHATSAPP_\|Coexistence\|graph.facebook" --include=*.md --include=*.ts . | grep -v node_modules | grep -v dlbjj-build-spec` → Expected: no hits outside the spec's history notes.
3. Commit: `Docs: runbook OpenWA, pré-voo, RGPD`.

Test command: `npm run verify`
