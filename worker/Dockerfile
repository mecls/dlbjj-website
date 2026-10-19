# DL-BJJ — worker do agente.
#
# Node 22 Alpine, dois estágios, utilizador sem privilégios. Não há passo de
# build: o tsx (esbuild) é o loader em dev e em produção, e o container corre
# as fontes TypeScript. Isso só se aguenta porque NENHUM import da app é de
# valor — o worker é autocontido (package.json próprio) e não copia a app.
#
# ── Estágio 1: dependências ──────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# devDependencies incluídas de propósito: o tsx É o runtime. --ignore-scripts
# porque nada aqui precisa de postinstall.
RUN npm install --no-audit --no-fund --ignore-scripts

# ── Estágio 2: runtime ───────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
# tini como PID 1: o Node trata o SIGTERM (index.ts fecha os envios a meio e
# liberta os leases), mas PID 1 também tem de colher órfãos, e o Node não o faz.
RUN apk add --no-cache tini
ENV NODE_ENV=production
# Teto, não reserva: se o processo chegar aqui, morrer com erro de heap é
# melhor do que ser OOM-killed pelo host sem mensagem nenhuma.
ENV NODE_OPTIONS=--max-old-space-size=384
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
# Falha o BUILD se algum import de valor escapar para fora de worker/, em vez
# de deixar o container entrar em crash-loop no arranque. O output é deitado
# fora: isto é uma asserção de resolução, não um build.
RUN ./node_modules/.bin/esbuild --bundle --packages=external --platform=node \
      --format=esm --outfile=/dev/null src/index.ts
USER node
EXPOSE 4001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.WORKER_PORT||4001)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
# `node --import tsx` corre o loader NO PROCESSO. O CLI `tsx` pode fazer fork,
# e um filho não recebe o SIGTERM que o Docker manda ao PID 1 — saltava o
# shutdown gracioso e deixava as linhas reclamadas presas 10 minutos.
CMD ["node", "--import", "tsx", "src/index.ts"]
