# Agente de WhatsApp — Guia de Arranque

O que o agente faz, como está montado, e **o que ainda depende de ti** antes de
entrar em produção. O código está feito e verificado (`npm run verify` corre
tudo: typecheck, lint, 300+ testes unitários, de integração e ponta a ponta,
incluindo um `next build` + `next start` sem segredos para provar que tudo
falha fechado). A spec completa está em `dlbjj-build-spec.md`; o runbook da
VPS em `docker/README.md`.

---

## 0. O que ainda é manual (lista para o Miguel)

1. **Criar o projeto Supabase dedicado da DL-BJJ** e correr, por ordem, no SQL
   Editor: `supabase/migrations/001_dlbjj_onboarding.sql`, `002_dlbjj_rls.sql`,
   `003_dlbjj_alunos.sql`, `004_dlbjj_correcoes.sql`, `005_dlbjj_area_aluno.sql` (todas idempotentes). Depois `npm run seed:turmas`
   com `.env.local` a apontar para lá (semeia as 14 turmas de `content/site.ts`).
2. **Variáveis na Vercel**: as de `.env.example` — Supabase (3),
   `OLLAMA_API_KEY`, `APP_BASE_URL=https://www.dlbjj.org`, `DLBJJ_WORKER_TOKEN`,
   `CRON_SECRET`, `DASHBOARD_PASSWORD`. **Só em Production.** Um deploy de
   Preview conta como produção para as portas (fecha-se sem segredos), mas não
   lhe dês a service role nem o token do worker: um preview com as chaves reais
   é uma segunda app a escrever na fila verdadeira.
3. **VPS**: clonar para `/opt/dlbjj`, preencher `docker/.env`, subir o gateway,
   criar a sessão, **emparelhar o 925 797 266 por código no telemóvel do Daniel**,
   subir o worker — passo a passo em `docker/README.md`.
4. **Dizer ao Daniel, por escrito, o que sai para o Ollama Cloud** (§5 abaixo)
   antes da primeira conversa real.
5. **Ler o guião** em `lib/bot/flow.ts` e os textos de reativação em
   `lib/reativacao/regras.ts`: é a voz da academia; o Daniel deve aprová-los.

Sem a Meta: **não há Cloud API, não há Coexistence, não há templates.** O
número liga-se ao gateway como dispositivo ligado; o Daniel fica com o telemóvel.

---

## 1. Como funciona

```
pessoa ──WhatsApp──▶ gateway OpenWA ──webhook──▶ worker (VPS) ──POST /api/agent/inbound──▶ app (Vercel)
                     (Baileys)       ◀── REST ──          ◀──── dlbjj_fila_saida ────────   + Supabase
```

- **A app** (Next.js 16, Vercel) tem o cérebro: o guião de onboarding, as
  palavras-chave (check-in, ficha, opt-out), as regras de reativação, o painel
  e as páginas públicas. **Nunca fala com o WhatsApp**: tudo o que diz vai para
  a fila `dlbjj_fila_saida`.
- **O worker** (`worker/`, Node 22 na VPS) é dono do socket e do relógio:
  recebe os webhooks assinados, encaminha o que chega, drena a fila com
  indicador de escrita e pausas, aplica as portas no momento de sair
  (interruptor, opt-out, janela 09:00–21:00, teto diário, restrição do
  WhatsApp) e deteta o Daniel a responder pelo telemóvel (pausa a conversa 24 h).
- **O gateway** (`rmyndharis/OpenWA` 0.14.4, motor Baileys, Docker) é a sessão
  do WhatsApp. Loopback só; nunca virado para a internet.

### O que a pessoa pode fazer no WhatsApp

| Escreve | Acontece |
|---|---|
| "Olá" (ou o link do site) | Onboarding: nome → para quem → modalidade → espaço → horário → origem → confirmação. Opções como texto numerado; responde com o número. |
| uma pergunta | O modelo responde SÓ com os factos de `content/site.ts`; preços nunca. Questões sensíveis passam ao Daniel. |
| `presente` / `cheguei` / `treinei` | Check-in na aula de hoje (pergunta qual, se houver várias; e para quem, se forem irmãos). Aluno inativo volta a ativo. |
| `perfil` / `a minha ficha` | Link para entrar na **área de aluno** (7 dias, uso único, 3 por dia). A ficha vive lá: faixa, início, histórico, ranking, calendário. |
| `parar` / "não quero mais mensagens" | Opt-out para sempre das proativas. Confirmado uma vez. |

### O que o aluno vê na área de aluno (`/aluno`)

Entra em `/aluno/entrar` com o telemóvel: o bot manda um código de 6 dígitos
pelo WhatsApp (10 minutos, 5 tentativas, 3 por hora, 30 por dia para a
academia toda; nada sai com o bot desligado ou a sessão em baixo) e a sessão
fica aberta 90 dias nesse aparelho. Irmãos no mesmo telemóvel trocam de aluno
no menu do avatar. Vê: **Início** (faixa, membro desde, última aula, aulas no
mês e desde o início, dias seguidos, posição no ranking, números da academia),
**Histórico**, **Ranking** (primeiros nomes e faixas de toda a academia; o
Daniel pode esconder um aluno), **Calendário** (as suas aulas, os eventos, as
presenças). Nunca vê saúde, encarregado, contactos nem dados de outros. Não há
chat nem check-in pela web: presença continua a ser `presente` no WhatsApp.

### O que o Daniel faz no painel (`/painel`)

Início (o agente, alunos ativos, presenças e inscrições do mês, conversas à
espera, a academia) · Mensagens (leads e conversa, assumir/retomar, **Enviar
inscrição**; o crachá e o sino acendem quando alguém espera por ele) · Alunos
(ficha, graduações, presenças, anonimizar, novo aluno, "Aparece no ranking") ·
Aulas (ranking e lista de presenças por dia) · Eventos (seminários,
graduações…; os alunos veem-nos no calendário) · Reativação (em atraso, Saltar,
Enviar agora, toques, opt-outs) · Perguntar (só com os dados; nunca inventa) ·
Agente (interruptor, sessão, envios desconhecidos, entradas por processar).

### O que corre sozinho

- **Reativação** (`vercel.json`, de hora a hora 08–20 UTC): R1 lead a meio 24 h,
  R2 72 h (depois perdida aos 7 dias), R3 lead concluída sem inscrição 10 dias,
  R4 aluno sem presença 14 dias, R5 30 dias (fica inativo). Teto de 10 proativas
  por dia, só 09:00–21:00 de Lisboa, espalhadas por 3 horas.
- **Anonimização** (mensal): 24 meses sem contacto → nome, telemóvel e dados
  pessoais substituídos; faixas, presenças e opt-outs ficam.

---

## 2. Desenvolver e testar sem rede

```bash
colima start            # ou o Docker que usares
supabase start          # portas 5434x (config.toml)
npm install
cp .env.test .env.local # ou preenche o .env.example
npm run seed:turmas
npm run dev             # http://localhost:3000/painel (password = DASHBOARD_PASSWORD)
```

Injetar mensagens no motor (a fila de saída é a "entrega"; vê-se no painel):

```bash
curl -X POST 'localhost:3000/api/sim/scenario?nome=adulto-jj'
curl -X POST 'localhost:3000/api/sim/scenario?nome=kids'
curl -X POST 'localhost:3000/api/sim/scenario?nome=pergunta-preco'
curl -X POST localhost:3000/api/sim/inject -H 'Content-Type: application/json' \
  -d '{"from":"351911111111","name":"Teste","text":"presente"}'
```

`OLLAMA_FAKE=1` troca o modelo por uma tabela (`lib/llm/fake.ts`). O worker
corre contra um gateway de mentira nos testes (`worker/test/fake-gateway.ts`).

```bash
npm run verify          # tudo; ~6 min (inclui next build)
npm run test:unit       # só o rápido
```

---

## 3. Variáveis de ambiente

| Onde | Variável | Nota |
|---|---|---|
| Vercel + worker | `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | projeto **dedicado** |
| Vercel | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | nunca usada no browser |
| Vercel | `OLLAMA_API_KEY`, `OLLAMA_MODEL`, `OLLAMA_BASE_URL` | `OLLAMA_FAKE=1` só em dev/testes |
| Vercel | `APP_BASE_URL` | base dos links públicos |
| Vercel + worker | `DLBJJ_WORKER_TOKEN` | o mesmo valor nos dois lados |
| Vercel | `CRON_SECRET` | bearer dos crons; `x-sim-secret` do simulador |
| Vercel | `DASHBOARD_PASSWORD` | sem ela, o painel **fecha** em produção |
| worker | `OPENWA_*`, `WORKER_*` | ver `worker/.env.example` e `docker/.env.example` |

Em produção, uma variável em falta **fecha** a porta: inbound 503, crons 503,
simulador 404, painel 307 (há um teste que o prova: `tests/e2e/producao.test.ts`).

---

## 4. Afinar sem deploy (`dlbjj_settings`)

`bot_enabled` (painel /agente), `proativas_por_dia` (10), `janela_inicio`/`janela_fim`
(09:00/21:00), `resposta_atraso_media_s`/`_desvio_s` (8/3), `proativa_intervalo_medio_s`/`_desvio_s`
(240/90), `digitar_wpm` (40), `humano_pausa_horas` (24). O worker relê a cada ciclo.

Se o WhatsApp mandar um `session.restriction`, o worker trava as proativas 60 min
sozinho e o painel diz-o. Se repetir: baixar `proativas_por_dia`.

---

## 5. RGPD — isto tem de ser dito ao Daniel

**O Ollama Cloud corre fora da União Europeia e não garante retenção zero fora
do plano Team.** Em cada chamada ao modelo saem: o texto da mensagem da pessoa,
o primeiro nome e o passo da conversa (onboarding); a pergunta do Daniel e as
linhas que a ferramenta devolveu (painel Perguntar — nunca encarregado, saúde,
contactos, NIF, morada, email, telemóvel ou nascimento).

O responsável pelo tratamento é a academia. Antes da primeira conversa real, o
Daniel tem de ser informado disto por escrito. Alternativas: um modelo
auto-hospedado, ou um fornecedor com compromisso escrito de retenção zero.

Além disso: dados de saúde e de menores só aparecem na ficha do aluno no
painel e no formulário; retenção de 24 meses após o último contacto; os
opt-outs são hashes e ficam para sempre.

---

## 6. Risco que nenhum código resolve

Isto é um cliente **não oficial** de WhatsApp. O número **pode ser banido** sem
aviso. O que reduz o risco está feito (responder a quem escreve não conta para
o teto; proativas limitadas, só de dia, espaçadas; nunca permanentemente
online; parar quando o WhatsApp avisa). O que fazer no dia em que acontecer
está em `docker/README.md`.

---

## 7. Mapa do código

```
content/site.ts                      ← horários e locais (fonte única; seed:turmas)
lib/bot/handle-inbound.ts            ← a ordem: opt-out → interruptor → check-in/ficha → regresso → guião
lib/bot/flow.ts · nlu.ts · render.ts · resolve.ts   ← guião, modelo, opções numeradas
lib/bot/checkin*.ts · perfil.ts · optout.ts         ← utilidades do aluno
lib/aluno/*                          ← área do aluno: códigos, sessões, estatísticas puras, consultas
lib/eventos.ts · lib/painel/*        ← eventos; números do painel e conversas à espera
components/app/*                     ← a moldura partilhada (barra lateral, cartões, mapa de calor, faixa)
lib/bot/outbound.ts                  ← a ÚNICA porta de saída (fila)
lib/inscricao/*                      ← formulário, validação, criação do aluno
lib/reativacao/*                     ← regras R1–R5, execução, resposta
lib/perguntar/*                      ← catálogo, ferramentas, modelo, resposta
lib/anonimizar.ts · limites.ts · tokens*.ts · tempo.ts
proxy.ts                             ← tokens e limite nas páginas públicas
app/painel/*  app/api/painel/*       ← painel e as suas ações (POST + 303)
app/inscricao/[token]  app/aluno/[token]           ← páginas públicas (o link do bot confirma e entra)
app/aluno/entrar  app/aluno/(area)/*  app/api/aluno/*   ← login por código e a área do aluno
app/api/agent/inbound  app/api/cron/*              ← worker → app; crons da Vercel
worker/src/*                         ← gateway, webhook, drenagem, passagem de mão
docker/*                             ← compose e runbook da VPS
supabase/migrations/*  supabase/seed.sql           ← esquema e fixtures
tests/* · worker/test/*              ← unit, integration, e2e; gateway e app de mentira
```
