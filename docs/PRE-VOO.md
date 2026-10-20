<!-- pagina-de-estado: https://claude.ai/code/artifact/bd929107-5044-4e6f-b55e-645633870f07 -->

# Pré-voo — Agente de WhatsApp

**A pergunta desta página:** *o que falta antes de o agente entrar em produção,
e de quem está cada passo à espera?*

Companheira do `AGENTE-WHATSAPP.md` (o *como*) e do `docker/README.md` (a VPS).
Esta página é o *o quê*, *por que ordem* e *de quem*.

---

## Onde estamos — 20 de Outubro de 2026

O agente foi reconstruído sobre o **OpenWA (Baileys)** numa VPS, em vez da
Cloud API da Meta: a app na Vercel escreve numa fila, um worker envia. Está
tudo no ramo `agente-openwa`, **por publicar**. Nada em produção mudou ainda.

| Facto | Como se verificou |
|---|---|
| Código, migrações, worker, Docker, painel, testes | `npm run verify` → exit 0 (typecheck, lint, unit, integration, e2e, worker, compose) |
| Revisão independente do ramo inteiro feita; 2 críticos + 14 importantes corrigidos com testes | `dlbjj-build-spec.md` §16 lista o que foi corrigido e o que ficou adiado |
| Produção falha fechado sem segredos | `tests/e2e/producao.test.ts`: `next build` + `next start` → inbound 503, crons 503, sim 404, painel 307 |
| A fila é a única porta de saída | `grep -rn "send-text" app lib` → 0; só em `worker/` |
| Nenhum teste precisa de rede | `OLLAMA_FAKE=1`, gateway e app de mentira; Supabase local |
| Ainda não correu contra um gateway real nem um número real | — |

---

## Fase 1 — Rever e publicar · **Miguel**

- [ ] Ler `dlbjj-build-spec.md` §16 (as decisões tomadas sem ti) e o guião
      (`lib/bot/flow.ts`, `lib/reativacao/regras.ts`).
- [ ] Merge do ramo `agente-openwa` em `main` e deploy. Sem variáveis novas na
      Vercel, produção continua fechada (503/404/307) — publicar é seguro.

## Fase 2 — Base de dados dedicada · **Miguel**

- [ ] Criar o projeto Supabase da DL-BJJ. Correr `001`, `002`, `003`, `004`, `005` no SQL Editor.
- [ ] `.env.local` com as 3 chaves → `npm run seed:turmas` → `npm run seed:turmas:check`.
- [ ] Vercel (**só Production**, nunca Preview): `NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OLLAMA_API_KEY`,
      `APP_BASE_URL`, `DLBJJ_WORKER_TOKEN` (`openssl rand -hex 32`), `CRON_SECRET`,
      `DASHBOARD_PASSWORD`.
- [ ] Confirmar `https://www.dlbjj.org/painel` → pede password; `/painel/agente`
      diz "o worker ainda não reportou".

## Fase 3 — Provar o loop com o modelo real · **Miguel**

- [ ] Em dev com `OLLAMA_FAKE` vazio e a `OLLAMA_API_KEY`, correr os cenários
      `adulto-jj`, `kids`, `pergunta-preco`, `pergunta-sensivel`.
- [ ] **O `pergunta-preco` é o que interessa:** se o modelo inventar um preço,
      pára tudo.

## Fase 4 — VPS · **Miguel + Daniel**

- [ ] `docker/README.md` passos 1–3 (clonar em `/opt/dlbjj`, `.env`, gateway, sessão).
- [ ] Passo 4: **o Daniel escreve o código de emparelhamento no telemóvel**
      (WhatsApp → Dispositivos ligados → Ligar com número).
- [ ] Passo 5: worker em cima; logs com "webhook registado".

## Fase 5 — Primeira conversa real · **Miguel**

- [ ] De um telemóvel teu, "Olá" para o 925 797 266; inscrição até ao fim.
- [ ] `presente` de um aluno de teste; `perfil` (o link abre "Entrar como …" e entra); `parar`.
- [ ] Entrar em `/aluno/entrar` com o teu número: o código chega pelo WhatsApp; ver
      Início, Histórico, Ranking, Calendário no telemóvel.
- [ ] O Daniel responde pelo telemóvel a essa conversa → o painel mostra
      "Daniel respondeu pelo telemóvel" e o bot cala-se.
- [ ] `/painel/agente` com a sessão ligada e "visto há N s".

## Fase 6 — Antes de o Daniel usar a sério · **Miguel + Daniel**

- [ ] **RGPD por escrito** ao Daniel (`AGENTE-WHATSAPP.md` §5).
- [ ] Guião e textos de reativação aprovados por ele.
- [ ] Primeiros dias com `proativas_por_dia` a 5 (número a aquecer), depois 10.
- [ ] Combinar quem olha para `/painel/agente` quando a sessão cair.

---

## Decisões à espera do Daniel

- **O guião** (`lib/bot/flow.ts`) e os **textos de reativação** nunca foram
  aprovados por ele. É a voz da academia a falar com clientes.
- **Teto diário** de proativas: 10 é a escolha conservadora; subir é escolha dele,
  com o risco de ban explicado.
- **NoGi** mapeia para o Treino Livre (Sexta 20:00, São Brás). Chega, ou quer
  que passe para humano?
