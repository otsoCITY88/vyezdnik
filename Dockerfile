# syntax=docker/dockerfile:1.7
# vyezdnik — Next.js 15 standalone build для Coolify / любого Docker-хоста

ARG NODE_VERSION=22-alpine

# ─────────────────────────────────────────────────────────────
# Stage 1: deps — установка npm зависимостей
# ─────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps

# ─────────────────────────────────────────────────────────────
# Stage 2: builder — сборка Next.js + .docx-шаблонов
# ─────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma generate перед build (генерит client в node_modules/.prisma)
RUN npx prisma generate

# Сборка .docx-шаблонов и Next.js standalone bundle
RUN npm run templates:build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage 3: runner — минимальный production-образ
# ─────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl tini \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3030
ENV HOSTNAME=0.0.0.0

# Standalone — содержит минимальный server.js + .next + node_modules только нужные
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma schema, .docx шаблоны, скрипты миграции/сидера/билда шаблонов
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/templates ./templates
COPY --from=builder --chown=nextjs:nodejs /app/files ./files
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
# lib/ нужен tsx-скриптам: prisma/seed.ts → ../lib/format, scripts/build-templates.ts и т.д.
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
# tsconfig для @/* алиасов tsx
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

# Prisma CLI + tsx нужны в рантайме для seed/db push (берём из builder, где сделан prisma generate)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@esbuild ./node_modules/@esbuild
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/get-tsconfig ./node_modules/get-tsconfig
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/resolve-pkg-maps ./node_modules/resolve-pkg-maps
# docx + docxtemplater + pizzip нужны для пересборки .docx-шаблонов в entrypoint
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/docx ./node_modules/docx
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@xmldom ./node_modules/@xmldom
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/jszip ./node_modules/jszip
# .bin/* — симлинки на бинарники (prisma, tsx и др.). Без них npx ищет не там.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin

# Скрипт первичной инициализации (db push + seed если БД пустая)
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# storage и БД будут лежать в volumes
RUN mkdir -p /app/storage /app/data \
    && chown -R nextjs:nodejs /app/storage /app/data

USER nextjs
EXPOSE 3030

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3030/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
