# O agente na VPS — instalação e operação

Dois containers: o **gateway do WhatsApp** (OpenWA, motor Baileys) e o **worker**
da DL-BJJ. A app **não** está aqui: corre na Vercel e nunca liga para esta
máquina; é o worker que lhe telefona (`POST /api/agent/inbound`) e que drena a
fila de saída no Supabase.

```
┌──────────────┐  webhook   ┌──────────────┐  HTTPS   ┌──────────────┐
│  openwa-api  │───────────▶│ dlbjj-worker │─────────▶│  app (Vercel)│
│  (WhatsApp)  │◀───────────│              │◀─ fila ──│  + Supabase  │
└──────────────┘   REST     └──────────────┘          └──────────────┘
```

**O worker é dono do socket e do relógio; a app é dona da base de dados e do
guião.** O worker não sabe o que dizer a ninguém: sabe de indicadores de
escrita, atrasos, leases e janelas horárias.

> Esta máquina é a **mesma da ARwatches**. Este é um projeto Compose **separado**
> (`dlbjj`): rede `dlbjj-agent`, volume `dlbjj-openwa-data`, gateway em
> `127.0.0.1:2786` (a ARwatches tem o 2785), worker na porta 4001 (a ARwatches
> tem a 4000). Nada é partilhado — nem chaves, nem sessão, nem número.

> **Os comentários estão sempre por CIMA do comando.** No zsh interativo o `#`
> não abre comentário; colar `comando   # nota` passa a nota como argumentos.

---

## 0. A máquina

Já está preparada pela ARwatches (Docker + Compose v2, `unattended-upgrades`,
utilizador no grupo `docker`). Sem transcrição de áudio, o que este projeto
acrescenta é modesto: o gateway em Baileys é um processo só e o worker está
parado quase sempre. 2 vCPU / 2 GB chegavam; na máquina de 4 vCPU da ARwatches
sobra.

Confirmar que a porta 2786 está livre antes de começar:

```bash
ss -ltnp | grep -E ':2786|:4001' || echo "livre"
```

## 1. O código

```bash
sudo mkdir -p /opt/dlbjj && sudo chown "$USER" /opt/dlbjj
git clone https://github.com/mecls/dlbjj-website.git /opt/dlbjj
cd /opt/dlbjj/docker
cp .env.example .env
```

Preencher `docker/.env`:

| Variável | Onde vem |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → projeto **DL-BJJ** → Project Settings → API |
| `APP_BASE_URL` | `https://www.dlbjj.org` |
| `DLBJJ_WORKER_TOKEN` | `openssl rand -hex 32` — **o mesmo valor** vai para a Vercel |
| `OPENWA_API_KEY` | `openssl rand -hex 32` |
| `OPENWA_WEBHOOK_SECRET` | `openssl rand -hex 32` |
| `OPENWA_SESSION_ID` | só existe depois do passo 3 — deixar o exemplo por agora |

## 2. Subir o gateway

```bash
docker compose up -d openwa-api
# tem de chegar a "healthy" (até ~40 s)
docker compose ps
```

## 3. Criar a sessão

O gateway resolve sessões pelo **id que gera**, nunca pelo nome. Guardar o `id`.

```bash
export KEY=$(grep '^OPENWA_API_KEY=' .env | cut -d= -f2)
curl -s -X POST http://127.0.0.1:2786/api/sessions \
  -H "X-API-Key: $KEY" -H 'Content-Type: application/json' \
  -d '{"name":"dlbjj"}'
```

Vem `{"id":"…","status":"created"}`. Se vier `409 … already exists`, a sessão
já foi criada numa tentativa anterior (o volume sobrevive a `down`); ler o id
da lista:

```bash
curl -s http://127.0.0.1:2786/api/sessions -H "X-API-Key: $KEY"
```

Escrever o id em `docker/.env` → `OPENWA_SESSION_ID=…`, e arrancar a sessão:

```bash
export SID=cola-aqui-o-id
curl -s -X POST http://127.0.0.1:2786/api/sessions/$SID/start -H "X-API-Key: $KEY"
```

## 4. Emparelhar o número — por código, não por QR

> ## ⚠️ O NÚMERO DA ACADEMIA É ESTE
> ```
> +351 925 797 266   →   351925797266   (só dígitos, com indicativo)
> ```
> O Daniel mantém o telemóvel; o gateway fica como **dispositivo ligado**.

```bash
curl -s -X POST http://127.0.0.1:2786/api/sessions/$SID/pairing-code \
  -H "X-API-Key: $KEY" -H 'Content-Type: application/json' \
  -d '{"phoneNumber":"351925797266"}'
```

No telemóvel do Daniel: **WhatsApp → Definições → Dispositivos ligados → Ligar
dispositivo → Ligar com número de telefone**, e escrever o código. Confirmar:

```bash
# tem de dizer "status":"ready" e o phone preenchido
curl -s http://127.0.0.1:2786/api/sessions/$SID -H "X-API-Key: $KEY"
```

## 5. Subir o worker

```bash
docker compose up -d --build dlbjj-worker
docker compose logs -f dlbjj-worker
```

O worker regista o webhook sozinho no arranque e **reescreve-o** se já existir
(o segredo não se lê de volta, por isso é sempre reposto). Nos logs:
`"webhook registado"` ou `"subscrição do webhook reescrita"`.

## 6. Verificar de ponta a ponta

1. Na Vercel, `DLBJJ_WORKER_TOKEN` tem o **mesmo** valor do `docker/.env`.
2. De um telemóvel que não seja o do Daniel, mandar "Olá" para o 925 797 266.
3. Seguir: `docker compose logs dlbjj-worker` → `"enviada"`; no painel
   `https://www.dlbjj.org/painel` a lead aparece e a resposta sai no telemóvel.
4. `https://www.dlbjj.org/painel/agente` mostra a sessão **ligada** e o
   "visto há N s" do heartbeat.

**Isto manda mesmo uma mensagem.** Testar com um número teu.

---

## Operar

| Situação | O que fazer |
|---|---|
| Ver estado | `docker compose ps` · `docker compose logs --tail 100 dlbjj-worker` |
| Reiniciar o worker | `docker compose restart dlbjj-worker` (acaba os envios a meio e liberta os leases; até 2 min) |
| Atualizar o código | `cd /opt/dlbjj && git pull && cd docker && docker compose up -d --build dlbjj-worker` |
| Desligar o bot | No painel `/agente`, o interruptor. Não é preciso tocar aqui. |
| Sessão **caída** no painel | `curl -s http://127.0.0.1:2786/api/sessions/$SID -H "X-API-Key: $KEY"`; se `disconnected`/`qr_ready`, repetir o passo 4 |
| `session.restriction` nos logs | O WhatsApp limitou a conta. O worker **pára as proativas 60 min sozinho**. Não desligar isso; se repetir, baixar `proativas_por_dia` em `dlbjj_settings` |
| Rodar segredos | Gerar novos, pôr em `docker/.env` (e na Vercel o `DLBJJ_WORKER_TOKEN`), `docker compose up -d` — o webhook é reescrito com o segredo novo |
| Espaço em disco | `docker system df`; os logs rodam a 10 MB × 5 por serviço |

### O dia em que o número for banido

É um cliente **não oficial**. Pode acontecer, sem aviso. Nada se perde na base de
dados (leads, alunos, conversas estão no Supabase). O que há a fazer: um número
novo, `docker compose down`, apagar o volume (`docker volume rm dlbjj-openwa-data`),
e repetir os passos 2–5 **devagar** — primeiros dias com `proativas_por_dia` a 5.

### Limitações conhecidas

- Um remetente com id de privacidade (`@lid`) que o motor não consiga resolver
  para número é **descartado** com aviso nos logs: a app identifica pessoas por
  telefone. `RESOLVE_LID_TO_PHONE=true` resolve a maioria.
- Áudio não é transcrito: a pessoa recebe "podes escrever por texto, por favor?".
- A presença do número não é controlável pelo gateway; só se garante que não
  fica permanentemente online (`BAILEYS_MARK_ONLINE_ON_CONNECT=false`).
