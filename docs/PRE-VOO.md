<!-- pagina-de-estado: https://claude.ai/code/artifact/bd929107-5044-4e6f-b55e-645633870f07 -->

# Pré-voo — Agente de WhatsApp

**A pergunta desta página:** *o que falta antes de o agente de inscrições do
WhatsApp entrar em produção, e de quem está cada passo à espera?*

Companheira do runbook `AGENTE-WHATSAPP.md` (o *como*). Esta página é o *o quê*,
*por que ordem* e *de quem*.

---

## A ordem é um argumento

As portas já estão fechadas **no código** — e continuam abertas **em produção**,
porque produção corre o commit antigo. Enquanto o push não acontecer,
`www.dlbjj.org/painel` responde `200` a quem lá for.

Isso inverte a ordem que esta página tinha antes das correções. Já não é
*"variáveis primeiro"*: com o código corrigido, **publicar é estritamente mais
seguro do que não publicar**, porque sem as variáveis o painel fecha-se sozinho
em vez de se abrir.

**Por isso o push é o passo 1, e as chaves vêm depois.** Feito por esta ordem,
não existe nenhum instante em que haja dados de pessoas atrás de uma porta aberta.

---

## Feito — Fase 1, as portas · 5 de Setembro de 2026

Verificado com o servidor em modo de produção (`next start`) e **sem nenhuma
variável de ambiente definida** — o pior caso possível.

| O que mudou | Como se verificou |
|---|---|
| As quatro server actions verificam quem as chama | `grep -c assertAuthed app/painel/actions.ts` → 4 |
| O painel fecha-se sem `DASHBOARD_PASSWORD` em produção | `curl -o /dev/null -w "%{http_code}" localhost/painel` → **307** (era 200) |
| As rotas do simulador desaparecem em produção | `POST /api/sim/inject` → **404** (era processado pelo motor) |
| O webhook recusa POST sem assinatura | `POST` sem `x-hub-signature-256` → **401** (era 200) |
| O handshake recusa o token vazio | `hub.verify_token=` → **403** (devolvia o challenge) |
| A chave `anon` deixou de viajar para o browser | `curl localhost/painel/login \| grep -c supabase` → **0** |
| O simulador continua a funcionar em dev | `POST /api/sim/inject` em `next dev` → 500 *supabaseUrl is required* (passou a guarda) |
| O parser da primeira mensagem | 5 casos, incluindo o template por preencher → 5/5 passam |
| Build, typecheck e lint | `npx tsc --noEmit` · `npx eslint .` · `npx next build` → todos exit 0 |

Ficheiros novos: `lib/sim-guard.ts`, `lib/bot/prefill.ts`,
`supabase/migrations/002_dlbjj_rls.sql`. Removido: `lib/supabase/browser.ts`.

---

## Estado verificado — 5 de Setembro de 2026

| Facto | Como se verificou |
|---|---|
| O código do agente **já está em produção** | `curl "https://www.dlbjj.org/api/whatsapp/webhook?hub.verify_token=errado"` → `403` |
| **Produção ainda corre o código antigo** | as correções estão por commitar: `git status --short` |
| O `/painel` **está aberto** em produção | `curl -o /dev/null -w "%{http_code}" https://www.dlbjj.org/painel` → `200` |
| As rotas do simulador estão vivas em produção | `curl .../api/sim/inject` → `405` (existe; `404` seria não existir) |
| A base de dados **não** está ligada | `curl -s https://www.dlbjj.org/painel \| grep -o "Falta configurar o Supabase"` → encontra |
| O loop completo **nunca correu** | não existe `.env.local`; nenhuma execução passou de `getOrCreateLead` |
| Não existem testes automáticos do fluxo | `find . -name "*.test.*" -not -path "./node_modules/*"` → vazio |

> Nada disto vaza dados **hoje**, porque a base de dados está desligada. O que
> conta é a ordem em que se liga.

---

## Fase 1 — Publicar as correções · **Miguel**

- [ ] **Rever e publicar.** O deploy é automático a partir do `main`
      (`github.com/mecls/dlbjj-website`). Assim que passar, produção fica a
      falhar fechado: painel `307`, simulador `404`, webhook `401`.

```bash
git diff                 # rever
git add -A
git commit -m "Fechar as portas do agente antes de ligar a base de dados"
git push
```

---

## Fase 2 — Ligar o cérebro · **Miguel**

- [ ] **Aplicar as migrações no Supabase**, por esta ordem:
      `001_dlbjj_onboarding.sql` e depois `002_dlbjj_rls.sql`. São idempotentes.
      **A `002` não é opcional.** A `001` dá à role `anon` `select using (true)`
      em `dlbjj_leads` e `dlbjj_mensagens`, e essa chave é pública — sem a `002`,
      qualquer pessoa lê todos os nomes, telefones e conversas pela API REST do
      Supabase. É dado pessoal: RGPD. Correr a `001` sozinha deixa o buraco aberto
      na base de dados mesmo com o código já corrigido.
      Confirmar no fim — deve devolver zero linhas:
      `select tablename, policyname from pg_policies where tablename like 'dlbjj_%';`
- [ ] **Copiar as três chaves do Supabase** (Project Settings → API):
      `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] **Criar a API key da Ollama Cloud** em ollama.com → `OLLAMA_API_KEY`.
      Confirmar que a conta tem o `gpt-oss:120b`; se não, mudar `OLLAMA_MODEL`.
- [ ] **Escolher a `DASHBOARD_PASSWORD`.** Sem ela o painel não abre em produção.
- [ ] **`cp .env.example .env.local`** e preencher. Deixar os `WHATSAPP_*` vazios.

---

## Fase 3 — Provar o loop · **Miguel**

Esta é a **primeira execução real do motor**. Até aqui nada correu de ponta a
ponta.

- [ ] `npm run dev` e correr os três cenários: `adulto-jj`, `kids`,
      `pergunta-preco`.
- [ ] Abrir `localhost:3000/painel` e ver as três conversas.
- [ ] **O cenário `pergunta-preco` é o que interessa:** confirma que o bot não
      inventa preços. Se inventar, pára tudo — o modelo não está a respeitar as
      regras e não pode falar com clientes.

---

## Fase 4 — Meta e Coexistence · **Miguel + Daniel**

- [ ] Business Portfolio verificado no Meta Business Manager.
- [ ] App do tipo *Business* em developers.facebook.com + produto WhatsApp.
- [ ] `WHATSAPP_APP_SECRET` (App → Settings → Basic).
- [ ] **Ligar o 925 797 266 por Coexistence** — o **Daniel** tem de ler um QR code
      na app WhatsApp Business dele. Tem de ser a app *Business* (verde).
- [ ] `WHATSAPP_PHONE_NUMBER_ID` (WhatsApp Manager → API Setup).
- [ ] System User com `whatsapp_business_messaging` + `whatsapp_business_management`
      → token permanente → `WHATSAPP_TOKEN`.
- [ ] Escolher a frase do `WHATSAPP_VERIFY_TOKEN`.

---

## Fase 5 — Produção · **Miguel**

- [ ] Meter **todas** as variáveis no Vercel (Production + Preview).
- [ ] Webhook na Meta: `https://www.dlbjj.org/api/whatsapp/webhook`, o mesmo
      verify token, **subscrever o campo `messages`** — sem essa subscrição a rota
      fica registada e nunca recebe nada.
- [ ] **Confirmar que o painel já pede password** antes de haver leads lá dentro:
      `curl -o /dev/null -w "%{http_code}" https://www.dlbjj.org/painel` tem de
      dar `307`, não `200`.
- [ ] Mandar "Olá" de um telemóvel que não seja o do Daniel e seguir a inscrição
      até ao fim.

---

## Fase 6 — Depois de vivo

Não bloqueia o arranque, mas o primeiro item morde já na primeira semana.

- [ ] **Auto-pausa por eco (Coexistence).** Se o Daniel responder pelo telemóvel,
      o bot continua a falar por cima dele até alguém carregar em *Pausar* no
      painel. Falta o nome exacto do campo de eco — o webhook já regista os campos
      que não trata (`[webhook] campo não tratado:`), por isso o primeiro payload
      real resolve a dúvida. Até lá: **pausa manual**, que é fiável.
- [ ] **Reengajamento.** `TEMPLATES` e `sendTemplate()` existem e ninguém os
      chama; `CRON_SECRET` só é lido pelo simulador; não há rota de cron nem
      `vercel.json`. Quem começa a inscrição e desiste nunca mais é contactado.
- [ ] **Interruptor do bot no painel.** Hoje o `bot_enabled` muda-se à mão na
      tabela `dlbjj_settings`.
- [ ] **Fotos perdidas.** O webhook nunca chama `downloadMedia()`; uma foto
      chega como o texto `"[foto recebida]"`.

---

## Decisões à espera do Daniel

- **O guião.** O texto pt-PT do bot está em `lib/bot/flow.ts` e nunca foi
  aprovado por ele. É a voz da academia a falar com clientes.
- **NoGi.** Hoje `nogi` mapeia para `tipo: "misto"` — um único horário, Sexta às
  20:00 em São Brás (`content/site.ts`). É isso que ele quer oferecer, ou deve
  passar para humano?
- **Saltar mais perguntas.** O bot já aproveita o **nome** do formulário
  pré-preenchido do link `wa.me`; a modalidade e o local ficam guardados na ficha
  mas continuam a ser perguntados. Saltá-los também torna a conversa mais rápida
  e menos conversada — decisão dele.
