# Agente de WhatsApp — Guia de Arranque

Tudo o que falta fazer para o agente de onboarding ficar a funcionar. O **código
está pronto e testado** (build, typecheck, lint e o handshake do webhook passam).
O que falta é **configuração** — contas, chaves e o setup na Meta. Segue por ordem.

---

## 1. Como funciona (resumo)

Alguém escreve no WhatsApp da academia → o `webhook` recebe → o **motor** faz as
perguntas de inscrição (nome → adulto/kids → modalidade → espaço → horário → como
conheceu → confirmação), usando os **horários reais** de `content/site.ts`. Para
texto livre e perguntas fora do guião, o **LLM (Ollama)** responde com base só no
site. O Daniel vê e gere tudo no **painel** `/painel` e pode assumir a conversa a
qualquer momento.

Sem as chaves do WhatsApp, o motor corre no **simulador** — dá para testar tudo
antes de tocar na Meta.

---

## 2. Estado atual

**Já feito (no código):**
- ✅ Webhook, motor de conversa, simulador, NLU (Ollama), dashboard `/painel`
- ✅ Migração da base de dados (`supabase/migrations/001_dlbjj_onboarding.sql`)
- ✅ Fluxo de onboarding ligado aos horários reais do site
- ✅ Build / typecheck / lint / verificação do webhook a passar

**Falta a ti (configuração):**
- ⬜ Aplicar a migração no Supabase + meter as chaves
- ⬜ Arranjar a chave da Ollama Cloud
- ⬜ Testar o loop completo no simulador (local)
- ⬜ Ativar a Coexistence na Meta (número 925 797 266) e obter as credenciais
- ⬜ Meter as variáveis no Vercel e fazer deploy
- ⬜ Registar o webhook na Meta e testar com um telemóvel real

---

## 3. O que precisas de arranjar

| # | Serviço | O que obténs |
|---|---------|--------------|
| 1 | **Supabase** (projeto da waldi) | URL do projeto, `anon key`, `service_role key` |
| 2 | **Ollama Cloud** (ollama.com) | `OLLAMA_API_KEY` |
| 3 | **Meta Business + WhatsApp** | App Secret, `phone_number_id`, token permanente, verify token |
| 4 | **Password do painel** | uma password à tua escolha (`DASHBOARD_PASSWORD`) |

---

## 4. Passo a passo

### A) Supabase (base de dados)

Usamos o **mesmo projeto Supabase da waldi**. As tabelas novas têm prefixo
`dlbjj_`, por isso não colidem com as da waldi.

1. Abre o **Supabase → SQL Editor**.
2. Cola o conteúdo de `supabase/migrations/001_dlbjj_onboarding.sql` e corre.
   (É idempotente — podes correr outra vez sem problema.) Cria as tabelas
   `dlbjj_leads`, `dlbjj_mensagens`, `dlbjj_settings` e liga o realtime.
3. Em **Supabase → Project Settings → API**, copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secreta, nunca no browser)

### B) Ollama Cloud (o "cérebro")

1. Em **ollama.com**, cria uma API key → `OLLAMA_API_KEY`.
2. O modelo por defeito é `gpt-oss:120b`. Se a tua conta não o tiver, muda
   `OLLAMA_MODEL` para outro que tenhas (ex.: `gpt-oss:20b`).

### C) Testar localmente no simulador (sem a Meta) ✅ recomendado antes de tudo

1. `cp .env.example .env.local` e preenche **só** Supabase + Ollama +
   `DASHBOARD_PASSWORD`. **Deixa os `WHATSAPP_*` vazios** → usa o simulador.
2. Arranca:
   ```bash
   npm install
   npm run dev          # se a porta 3000 estiver ocupada:  PORT=3005 npm run dev
   ```
3. Corre os cenários (dão-te o `phone` de volta):
   ```bash
   curl -X POST 'localhost:3000/api/sim/scenario?nome=adulto-jj'
   curl -X POST 'localhost:3000/api/sim/scenario?nome=kids'
   curl -X POST 'localhost:3000/api/sim/scenario?nome=pergunta-preco'
   ```
4. Abre **`localhost:3000/painel`** (password = `DASHBOARD_PASSWORD`) e vê as
   conversas em tempo real. O cenário `pergunta-preco` confirma que o bot **não
   inventa preços**.
5. Para simular mensagens à mão:
   ```bash
   curl -X POST localhost:3000/api/sim/inject -H 'Content-Type: application/json' \
     -d '{"from":"351911111111","name":"Teste","text":"Olá"}'
   ```

### D) Meta / WhatsApp Cloud API com **Coexistence**

> Coexistence = o Daniel mantém a app **WhatsApp Business** no telemóvel E o bot
> partilha o mesmo número. Tem de ser a app **Business** (verde), não o WhatsApp
> normal. ⚠️ A interface da Meta muda com frequência — os nomes podem variar.

1. **Meta Business Manager** → garante que o *Business Portfolio* está verificado.
2. **developers.facebook.com** → cria uma **App** (tipo *Business*) e adiciona o
   produto **WhatsApp**.
3. **App → Settings → Basic** → copia o **App Secret** → `WHATSAPP_APP_SECRET`.
4. Em **WhatsApp Manager**, adiciona o número **925 797 266** pela via de
   **Coexistence** ("connect an existing WhatsApp Business app number") — o Daniel
   confirma lendo um **QR code** na app WhatsApp Business dele.
5. Em **WhatsApp Manager → API Setup**, copia o **`phone_number_id`** →
   `WHATSAPP_PHONE_NUMBER_ID`.
6. Cria um **System User** (Business Settings → Users → System Users) com as
   permissões `whatsapp_business_messaging` + `whatsapp_business_management` e gera
   um **token permanente** → `WHATSAPP_TOKEN`.
7. Escolhe uma frase qualquer para `WHATSAPP_VERIFY_TOKEN` (ex.: `dlbjj-verify-2026`)
   — vais usá-la nos dois lados (env + config do webhook).

### E) Deploy no Vercel + registar o webhook

1. No **Vercel → Project (DLBJJ-lp) → Settings → Environment Variables**, mete
   **todas** as variáveis da secção 6 (Production + Preview).
2. Faz **deploy** (`git push` ou `vercel --prod`).
3. Na **Meta → App → WhatsApp → Configuration → Webhook**:
   - **Callback URL:** `https://www.dlbjj.org/api/whatsapp/webhook`
   - **Verify token:** o mesmo `WHATSAPP_VERIFY_TOKEN`
   - Clica *Verify and Save* (a Meta chama o `GET`; a nossa rota devolve o
     `challenge` se o token bater).
   - **Subscreve o campo `messages`.** ⚠️ Para a Coexistence, subscreve também o
     campo de **eco de mensagens da app** (o nome exato depende da versão da Meta —
     ver secção 7).

### F) Testar em produção

1. De um telemóvel (não o do Daniel), manda "Olá" para o **925 797 266**.
2. O bot deve responder e guiar a inscrição.
3. Confirma no **`https://www.dlbjj.org/painel`** que a lead aparece e a conversa
   é gravada.

---

## 5. Operar o dia-a-dia — painel `/painel`

- **Lista de leads:** nome, estado, passo, e há quanto tempo escreveram.
- **Detalhe da lead:** ficha completa (modalidade, espaço, horário, como conheceu)
  + a conversa toda.
- **Pausar bot (assumir):** o Daniel passa a responder ele; o bot cala-se nessa
  conversa. **Retomar bot** devolve-a ao agente.
- Responder pela caixa do painel **assume automaticamente** a conversa (pausa o bot).
- **Ligar/desligar o bot globalmente:** na tabela `dlbjj_settings`, muda
  `bot_enabled` para `off`/`on`.

---

## 6. Referência das variáveis de ambiente

| Variável | Onde obter | Obrigatória? |
|----------|------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API (secreta) | ✅ |
| `OLLAMA_API_KEY` | ollama.com | ✅ |
| `OLLAMA_BASE_URL` | (default `https://ollama.com/v1`) | opcional |
| `OLLAMA_MODEL` | (default `gpt-oss:120b`) | opcional |
| `DASHBOARD_PASSWORD` | à tua escolha | ✅ (senão o painel fica aberto) |
| `WHATSAPP_TOKEN` | Meta System User (token permanente) | ✅ produção |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Manager → API Setup | ✅ produção |
| `WHATSAPP_VERIFY_TOKEN` | à tua escolha (igual no webhook) | ✅ produção |
| `WHATSAPP_APP_SECRET` | Meta App → Settings → Basic | ✅ produção |
| `CRON_SECRET` | à tua escolha | opcional (ainda não usado) |

> Sem `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`, corre o **simulador**.
> Supabase + Ollama são sempre precisos para o loop funcionar.

---

## 7. A confirmar / pontos em aberto

- **Eco da Coexistence (auto-pausa):** para o bot detetar sozinho quando o Daniel
  responde pela app e se calar, é preciso confirmar o **nome exato do campo de eco**
  do webhook na documentação atual de Coexistence da Meta. Até lá, funciona a
  **pausa manual** no painel (que é sempre fiável).
- **NoGi:** hoje só existe como "Treino Livre (Gi e NoGi)", Sexta 20:00 em São Brás.
  Confirmar com o Daniel se oferecer NoGi = esse slot, ou encaminhar para humano.
- **Texto do bot:** o guião pt-PT está escrito em `lib/bot/flow.ts` — vale a pena o
  Daniel dar uma vista de olhos e aprovar as mensagens.
- ⚠️ **Segredos da waldi:** o `waldi-mvp/.env.example` tem chaves reais commitadas.
  Se reutilizares alguma, roda-a por segurança.

---

## 8. Resolução de problemas

| Sintoma | Causa provável / solução |
|---------|--------------------------|
| Painel dá erro "Falta configurar o Supabase" | Faltam `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` |
| `sim/inject` devolve 500 | Supabase não configurado ou migração não aplicada |
| Webhook não valida na Meta | `WHATSAPP_VERIFY_TOKEN` diferente do que meteste no config do webhook |
| Bot não responde a mensagens reais | Falta subscrever o campo `messages`; ou `WHATSAPP_TOKEN`/`phone_number_id` errados; ou o número não está em Coexistence |
| Bot responde por cima do Daniel | Usa **Pausar bot** no painel (o auto-pausa por eco ainda não está ligado) |
| O bot "não sabe" e escala tudo | Confirma `OLLAMA_API_KEY` e que o `OLLAMA_MODEL` existe na tua conta |
| Conversa duplicada | (não deve acontecer) a dedupe por `wa_message_id` protege contra reentregas da Meta |

---

### Ficheiros-chave (para referência)

```
content/site.ts                         ← modalidades e horários reais (fonte de verdade)
lib/bot/flow.ts                         ← guião/texto do bot (perguntas e opções)
lib/bot/handle-inbound.ts               ← máquina de estados do onboarding
lib/bot/nlu.ts                          ← chamada ao Ollama + regras "não inventar"
app/api/whatsapp/webhook/route.ts       ← webhook da Meta
app/painel/*                            ← dashboard do Daniel
supabase/migrations/001_dlbjj_onboarding.sql  ← tabelas dlbjj_
.env.example                            ← modelo das variáveis
```
