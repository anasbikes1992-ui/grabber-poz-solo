# ==============================================================================
# GRABBER SOLO / BUSINESS OS — MULTI-STAGE PRODUCTION DOCKERFILE
#
# Shared image, one container per tenant: build once, run many times with
# different runtime env (DATABASE_URL, APP_URL, AUTH_SECRET, etc. — see
# src/lib/config/app-url.ts for why those are non-NEXT_PUBLIC_ names).
# ==============================================================================

# 1. Base Stage
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# 2. Dependencies Stage
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
ENV NODE_ENV=development
RUN npm ci --include=dev

# 3. Builder Stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build-time-only placeholders. NODE_ENV=production above makes several
# server modules throw during static generation if these are completely
# unset (src/lib/auth/session.ts requires AUTH_SECRET; the cron route
# requires CRON_SECRET; nothing prerenders against a real DB, so any valid-
# looking DATABASE_URL works). These values are NEVER copied into the runner
# stage below — a fresh `FROM node:20-alpine AS runner` does not inherit ENV
# from an earlier stage — so they cannot leak into a running container. Each
# tenant's real secrets are injected as runtime env by the deploy platform.
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/build_db"
ENV AUTH_SECRET="build_time_placeholder_secret_32chars_long_minimum"
ENV CRON_SECRET="build_time_placeholder_cron_secret"

# Optional real build args — only for values a CLIENT bundle genuinely needs,
# since NEXT_PUBLIC_* is inlined at build time and can't vary per tenant
# container. Everything else (APP_URL, SUPABASE_URL, STORE_NAME, ...) is read
# from non-public runtime env via src/lib/config/app-url.ts — do not add more
# NEXT_PUBLIC_* build args without checking that file's comment first.
ARG NEXT_PUBLIC_SENTRY_DSN=""
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}

RUN npm run build

# 4. Production Runner Stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root system user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone app (traces only what src/ actually imports)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migration tooling — NOT traced into .next/standalone since these scripts
# aren't imported by the app itself. A tenant container must be able to run
# its own migrations (`node scripts/bootstrap-db.mjs`) since the database is
# never exposed outside the Docker network.
#
# Neither `postgres` nor `dotenv` end up as physical node_modules packages in
# .next/standalone even though the app itself uses `postgres` — Next's
# webpack build bundles it directly into the compiled route files instead of
# copying it as an external package (only names listed in next.config.mjs's
# `serverExternalPackages` get copied that way). These CLI scripts run
# outside that webpack bundle via plain `node`, so they need the real
# packages physically present. Verified by running each script inside this
# exact image — do not remove either COPY without re-checking.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres

# Ensure uploads directory exists with correct permissions — mount a volume
# here in production; without one this is ephemeral per container restart.
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
