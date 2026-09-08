# ==============================================================================
# GRABBER SOLO / BUSINESS OS — MULTI-STAGE PRODUCTION DOCKERFILE
# ==============================================================================

# 1. Base Stage
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# 2. Dependencies Stage
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 3. Builder Stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment build variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

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

# Copy static assets and standalone build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create uploads directory with correct permissions
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
