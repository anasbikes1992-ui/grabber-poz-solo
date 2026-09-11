# Grabber Business OS — Deployment Readiness Audit

**Audit Date:** 2026-09-11  
**Target Architecture:** Multi-instance deployment on shared VPS (1 demo instance + N isolated production instances on separate domains with separate PostgreSQL databases, built from a single shared Docker image).

---

## BLOCKERS

The following items prevent a single shared Docker image from serving multiple isolated tenants via environment-variable configuration alone:

1. **`NEXT_PUBLIC_*` Build-Time Inlining in Client Bundles**  
   - **Locations:** [src/app/setup/page.tsx:82](file:///d:/GRABBER%20POZ%20SOLO/src/app/setup/page.tsx#L82) (`NEXT_PUBLIC_STORE_NAME`), [src/instrumentation-client.ts:3](file:///d:/GRABBER%20POZ%20SOLO/src/instrumentation-client.ts#L3) (`NEXT_PUBLIC_SENTRY_DSN`), [src/lib/config/storefront-config.shared.ts:100](file:///d:/GRABBER%20POZ%20SOLO/src/lib/config/storefront-config.shared.ts#L100) (`NEXT_PUBLIC_WHATSAPP_NUMBER`).  
   - **Impact:** Next.js build-time inlining bakes client-side `process.env.NEXT_PUBLIC_*` into immutable static JS chunks during `docker build`. Containers started from the same image will share the build-time placeholder or tenant value.  
   - **Fix:** Refactor client components to receive store name, hotline, and public URLs from server-rendered props (`page.tsx`), runtime root layout context, or the runtime `/api/storefront/public` endpoint.

2. **Dockerfile Placeholder Values Baked into Static Build**  
   - **Location:** [Dockerfile:26-30](file:///d:/GRABBER%20POZ%20SOLO/Dockerfile#L26-L30)  
     ```dockerfile
     ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/build_db"
     ENV NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
     ENV NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder"
     ENV AUTH_SECRET="build_time_placeholder_secret_32chars_long_minimum"
     ENV CRON_SECRET="build_time_placeholder_cron_secret"
     ```  
   - **Impact:** While server-side runtime code reads `process.env` dynamically, any static pre-rendered routes (SSG) in `.next/server/app` evaluate with these placeholder strings at build time.  
   - **Fix:** Mark all tenant-sensitive routes as dynamic (`export const dynamic = 'force-dynamic'`) or ensure runtime DB/env overrides.

3. **In-Memory IP Rate Limiter State Isolation**  
   - **Location:** [src/lib/security/rate-limit.ts:8](file:///d:/GRABBER%20POZ%20SOLO/src/lib/security/rate-limit.ts#L8) (`const buckets = new Map<string, Bucket>();`)  
   - **Impact:** Rate limiting is in-process memory only. In a multi-replica or multi-process setup per tenant, buckets are not shared across processes.  
   - **Fix:** Keep as single-container per tenant or back rate-limiting with Redis / PostgreSQL unlogged table if horizontal container scaling is required per tenant.

4. **Local Filesystem Upload Fallback Stored in Ephemeral Container FS**  
   - **Locations:** [src/app/api/storage/upload/route.ts:55-60](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/storage/upload/route.ts#L55-L60), [src/app/api/media/route.ts:70-74](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/media/route.ts#L70-L74), [Dockerfile:52](file:///d:/GRABBER%20POZ%20SOLO/Dockerfile#L52)  
   - **Impact:** When `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are unset, uploads write to container-local `/app/public/uploads`. A container restart or redeploy wipes uploaded files unless a persistent Docker volume is mounted to `/app/public/uploads`.  
   - **Fix:** Require Supabase/S3 object storage or mount a tenant-specific persistent host volume to `/app/public/uploads` for each container instance.

---

## UNKNOWNS

1. **Vercel vs VPS Production Canonical Path:** Codebase contains both Vercel edge/serverless constructs ([vercel.json:1-13](file:///d:/GRABBER%20POZ%20SOLO/vercel.json#L1-L13), [src/lib/db/connection.ts:27](file:///d:/GRABBER%20POZ%20SOLO/src/lib/db/connection.ts#L27), [src/lib/storefront/seo.ts:6](file:///d:/GRABBER%20POZ%20SOLO/src/lib/storefront/seo.ts#L6)) and standalone Docker runner constructs ([Dockerfile:35-58](file:///d:/GRABBER%20POZ%20SOLO/Dockerfile#L35-L58)). Which host platform is the primary commercial target?
2. **Creative Engine Worker Hosting:** [src/lib/creative/creative-repo.ts](file:///d:/GRABBER%20POZ%20SOLO/src/lib/creative/creative-repo.ts) connects to `CREATIVE_WORKER_URL` (Python FastAPI on port 8765). Is this service shared globally across all tenant instances or provisioned per tenant?
3. **WhatsApp Webhook Inbound Multi-Tenant Fan-Out:** Meta WhatsApp Cloud API webhooks require a single webhook endpoint URL per Meta App ID. If multiple tenant domains exist, how will Meta webhook traffic route to specific tenant databases without a reverse proxy router?

---

## 1. Repo Shape

- **Monorepo Tool:** `NONE`. The repository is a single standalone Next.js application. No `turbo.json`, `nx.json`, `lerna.json`, or `pnpm-workspace.yaml` exists in the repository.
- **Packages & Deployable App:** Single package defined in [package.json:1-98](file:///d:/GRABBER%20POZ%20SOLO/package.json#L1-L98) named `"grabber-poz-solo"`. It contains both storefront and back-office POS/ERP in a unified Next.js App Router structure under [src/app/](file:///d:/GRABBER%20POZ%20SOLO/src/app).
- **Secondary sub-services:**
  - `creative-engine/`: Python FastAPI worker (`creative-engine/main.py`). Not a Node package.
- **Package Manager & Lockfile:** `npm` with `package-lock.json` (`lockfileVersion: 3`, size 453,026 bytes).
- **Node.js Version:**
  - `.nvmrc`: `NOT FOUND` (looked in root `/`).
  - `package.json` engines: `NOT FOUND` in [package.json](file:///d:/GRABBER%20POZ%20SOLO/package.json).
  - `Dockerfile:6`: `FROM node:20-alpine AS base`
  - `.github/workflows/fleet-deploy.yml:25`: `node-version: 20`

---

## 2. Build & Runtime Config

### `next.config.mjs` Full Content ([next.config.mjs:1-22](file:///d:/GRABBER%20POZ%20SOLO/next.config.mjs#L1-L22)):
```javascript
import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['better-sqlite3', 'node-thermal-printer', 'pdf-lib'],
};

const sentryEnabled = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG || undefined,
      project: process.env.SENTRY_PROJECT || undefined,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : nextConfig;
```

- **`output: 'standalone'`**: `YES`, set explicitly at [next.config.mjs:5](file:///d:/GRABBER%20POZ%20SOLO/next.config.mjs#L5).
- **`images.remotePatterns` / `domains` / `unoptimized`**: `NOT FOUND` in `next.config.mjs` (uses default Next.js image optimization behavior).
- **`serverExternalPackages`**: `['better-sqlite3', 'node-thermal-printer', 'pdf-lib']` ([next.config.mjs:7](file:///d:/GRABBER%20POZ%20SOLO/next.config.mjs#L7)).
- **`env`, `serverRuntimeConfig`, `publicRuntimeConfig`, `rewrites`, `headers`**: `NOT FOUND` in `next.config.mjs`.
- **Middleware Matcher & Logic ([src/middleware.ts:184-186](file:///d:/GRABBER%20POZ%20SOLO/src/middleware.ts#L184-L186)):**
  - Matcher: `['/((?!_next/static|_next/image).*)']`
  - Logic:
    1. Static assets & `_next` bypass ([src/middleware.ts:122-128](file:///d:/GRABBER%20POZ%20SOLO/src/middleware.ts#L122-L128)).
    2. In-memory IP sliding-window rate limit on `/api/*` ([src/middleware.ts:130-139](file:///d:/GRABBER%20POZ%20SOLO/src/middleware.ts#L130-L139)).
    3. Public route whitelist bypass ([src/middleware.ts:141-143](file:///d:/GRABBER%20POZ%20SOLO/src/middleware.ts#L141-L143)).
    4. Customer session cookie gate for `/shop/account` ([src/middleware.ts:146-157](file:///d:/GRABBER%20POZ%20SOLO/src/middleware.ts#L146-L157)).
    5. Staff HMAC session cookie verification (`grabber_session`) via Web Crypto HMAC-SHA256 for protected APIs and `/app`, `/pos`, `/dashboard`, etc. ([src/middleware.ts:161-179](file:///d:/GRABBER%20POZ%20SOLO/src/middleware.ts#L161-L179)).
- **Build Command:** `npm run build` ([package.json:8](file:///d:/GRABBER%20POZ%20SOLO/package.json#L8), which invokes `next build`).
- **Start Command:** `npm start` ([package.json:9](file:///d:/GRABBER%20POZ%20SOLO/package.json#L9), `next start`) or container entrypoint `node server.js` ([Dockerfile:58](file:///d:/GRABBER%20POZ%20SOLO/Dockerfile#L58)).
- **Default Port:** `3000` ([Dockerfile:39](file:///d:/GRABBER%20POZ%20SOLO/Dockerfile#L39)).

---

## 3. BUILD-TIME vs RUNTIME CONFIG

### Inventory of All `NEXT_PUBLIC_*` Variables

| Variable Name | File & Line of Usage | Client or Server Context | Per-Tenant or Global? | Risk of Shared Image Lock-In |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | [src/lib/payments/payhere/client.ts:42](file:///d:/GRABBER%20POZ%20SOLO/src/lib/payments/payhere/client.ts#L42)<br>[src/lib/payments/webxpay/client.ts:23](file:///d:/GRABBER%20POZ%20SOLO/src/lib/payments/webxpay/client.ts#L23)<br>[src/lib/storefront/seo.ts:4](file:///d:/GRABBER%20POZ%20SOLO/src/lib/storefront/seo.ts#L4)<br>[src/lib/whatsapp/inbound-handler.ts:58](file:///d:/GRABBER%20POZ%20SOLO/src/lib/whatsapp/inbound-handler.ts#L58)<br>[src/app/api/storage/upload/route.ts:61](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/storage/upload/route.ts#L61) | Server | Per-Tenant | **LOW** (Read server-side at runtime, but will bake into client bundles if imported client-side) |
| `NEXT_PUBLIC_STORE_NAME` | [src/app/setup/page.tsx:82](file:///d:/GRABBER%20POZ%20SOLO/src/app/setup/page.tsx#L82)<br>[src/lib/ai/daily-brief.ts:43](file:///d:/GRABBER%20POZ%20SOLO/src/lib/ai/daily-brief.ts#L43)<br>[src/lib/config/business-settings.ts:121](file:///d:/GRABBER%20POZ%20SOLO/src/lib/config/business-settings.ts#L121)<br>[src/lib/whatsapp/inbound-handler.ts:53](file:///d:/GRABBER%20POZ%20SOLO/src/lib/whatsapp/inbound-handler.ts#L53) | **Client** ([src/app/setup/page.tsx](file:///d:/GRABBER%20POZ%20SOLO/src/app/setup/page.tsx)) & Server | Per-Tenant | **HIGH** (Inlined into `setup/page.tsx` client bundle at build time) |
| `NEXT_PUBLIC_STORE_URL` | [src/app/api/social/feeds/meta-catalog/route.ts:16](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/social/feeds/meta-catalog/route.ts#L16)<br>[src/lib/social/publish-links.ts:19](file:///d:/GRABBER%20POZ%20SOLO/src/lib/social/publish-links.ts#L19) | Server | Per-Tenant | **LOW** (Server runtime only) |
| `NEXT_PUBLIC_SITE_URL` | [src/lib/creative/creative-pdf-processor.ts:25](file:///d:/GRABBER%20POZ%20SOLO/src/lib/creative/creative-pdf-processor.ts#L25)<br>[src/lib/creative/creative-repo.ts:101](file:///d:/GRABBER%20POZ%20SOLO/src/lib/creative/creative-repo.ts#L101) | Server | Per-Tenant | **LOW** (Server runtime only) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | [src/lib/config/storefront-config.shared.ts:100](file:///d:/GRABBER%20POZ%20SOLO/src/lib/config/storefront-config.shared.ts#L100)<br>[src/lib/whatsapp/inbound-handler.ts:12](file:///d:/GRABBER%20POZ%20SOLO/src/lib/whatsapp/inbound-handler.ts#L12) | Shared Module | Per-Tenant | **MEDIUM** (Overridden by DB when merchant saves in Storefront settings) |
| `NEXT_PUBLIC_SUPABASE_URL` | [src/app/api/storage/upload/route.ts:25](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/storage/upload/route.ts#L25)<br>[src/app/api/media/route.ts:43](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/media/route.ts#L43)<br>[src/app/api/integrations/health/route.ts:78](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/integrations/health/route.ts#L78) | Server API | Per-Tenant | **LOW** (Server runtime only; no client SDK initialized) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [Dockerfile:28](file:///d:/GRABBER%20POZ%20SOLO/Dockerfile#L28), [scripts/validate-env.mjs:169](file:///d:/GRABBER%20POZ%20SOLO/scripts/validate-env.mjs#L169) | Build script | Per-Tenant | **LOW** (Unused in application runtime code) |
| `NEXT_PUBLIC_META_PIXEL_ID` | [src/lib/config/resolve-marketing.ts:9](file:///d:/GRABBER%20POZ%20SOLO/src/lib/config/resolve-marketing.ts#L9) | Server API | Per-Tenant | **LOW** (DB settings override env at runtime) |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`| [src/lib/config/resolve-marketing.ts:10](file:///d:/GRABBER%20POZ%20SOLO/src/lib/config/resolve-marketing.ts#L10) | Server API | Per-Tenant | **LOW** (DB settings override env at runtime) |
| `NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID`| [src/lib/config/resolve-marketing.ts:11](file:///d:/GRABBER%20POZ%20SOLO/src/lib/config/resolve-marketing.ts#L11) | Server API | Per-Tenant | **LOW** (DB settings override env at runtime) |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | [src/lib/config/resolve-marketing.ts:12](file:///d:/GRABBER%20POZ%20SOLO/src/lib/config/resolve-marketing.ts#L12) | Server API | Per-Tenant | **LOW** (DB settings override env at runtime) |
| `NEXT_PUBLIC_SENTRY_DSN` | [src/instrumentation-client.ts:3](file:///d:/GRABBER%20POZ%20SOLO/src/instrumentation-client.ts#L3)<br>[sentry.client.config.ts:3](file:///d:/GRABBER%20POZ%20SOLO/sentry.client.config.ts#L3) | **Client** | Global / Tenant | **HIGH** (Inlined into Sentry client runtime bundle at build time) |

### SHARED IMAGE BLOCKERS

| Variable / Pattern | Offending Code Citation | Reason for Blocker | Fix Required |
| :--- | :--- | :--- | :--- |
| `process.env.NEXT_PUBLIC_STORE_NAME` in Client Page | [src/app/setup/page.tsx:82](file:///d:/GRABBER%20POZ%20SOLO/src/app/setup/page.tsx#L82) | Client bundle replaces this with build-time placeholder during webpack/turbopack compilation. | Read store name from server action or fetch `/api/installation/identity`. |
| `NEXT_PUBLIC_SENTRY_DSN` in Client Instrumentation | [src/instrumentation-client.ts:3](file:///d:/GRABBER%20POZ%20SOLO/src/instrumentation-client.ts#L3) | Inlined into client error-monitoring bundle at build time. | Fetch DSN from `/api/health` or inject via dynamic `<script>` tag. |
| Hardcoded fallback currency `LKR` | [src/app/barcodes/page.tsx:32](file:///d:/GRABBER%20POZ%20SOLO/src/app/barcodes/page.tsx#L32), [src/lib/currency/fx-rates.ts:28](file:///d:/GRABBER%20POZ%20SOLO/src/lib/currency/fx-rates.ts#L28) | Default currency is `LKR` if no DB business profile is configured. | Configurable per-instance in PostgreSQL `business_profiles` table. |
| Hardcoded store contact fallbacks | [src/components/pos/thermal-receipt.tsx:50-52](file:///d:/GRABBER%20POZ%20SOLO/src/components/pos/thermal-receipt.tsx#L50-L52) | Default fallback phone `+94 11 234 5678` and address `Colombo`. | Read from tenant `business_profiles` table at runtime. |

---

## 4. Environment Variables — Complete Inventory

| Variable Name | Required / Optional | Where Consumed (File:Line) | Default if Missing | Per-Tenant or Global | Secret? | Present in `.env.example`? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Required** | [src/db/index.ts:14](file:///d:/GRABBER%20POZ%20SOLO/src/db/index.ts#L14)<br>[src/lib/db/connection.ts:16](file:///d:/GRABBER%20POZ%20SOLO/src/lib/db/connection.ts#L16) | `null` (dev: `localhost:5432/grabber_business_os`) | Per-Tenant | **YES** | **YES** ([.env.example:8](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L8)) |
| `POSTGRES_URL` | Optional (Vercel) | [src/lib/db/connection.ts:18](file:///d:/GRABBER%20POZ%20SOLO/src/lib/db/connection.ts#L18) | `null` | Per-Tenant | **YES** | **YES** ([.env.example:9](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L9)) |
| `POSTGRES_URL_NON_POOLING` | Optional (Vercel) | [src/lib/db/connection.ts:20](file:///d:/GRABBER%20POZ%20SOLO/src/lib/db/connection.ts#L20) | `null` | Per-Tenant | **YES** | NO |
| `SUPABASE_DB_URL` | Optional | [src/lib/db/connection.ts:21](file:///d:/GRABBER%20POZ%20SOLO/src/lib/db/connection.ts#L21) | `null` | Per-Tenant | **YES** | NO |
| `AUTH_SECRET` | **Required (Prod)** | [src/lib/auth/session.ts:16](file:///d:/GRABBER%20POZ%20SOLO/src/lib/auth/session.ts#L16)<br>[src/lib/auth/session-edge.ts:26](file:///d:/GRABBER%20POZ%20SOLO/src/lib/auth/session-edge.ts#L26) | `dev-only-insecure-auth-secret-change-me` (Throws in prod) | Per-Tenant | **YES** | **YES** ([.env.example:12](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L12)) |
| `NEXTAUTH_SECRET` | Optional fallback | [src/lib/auth/session.ts:16](file:///d:/GRABBER%20POZ%20SOLO/src/lib/auth/session.ts#L16) | `null` | Per-Tenant | **YES** | NO |
| `SESSION_SECRET` | Optional fallback | [src/lib/auth/session.ts:16](file:///d:/GRABBER%20POZ%20SOLO/src/lib/auth/session.ts#L16) | `null` | Per-Tenant | **YES** | NO |
| `MASTER_ENCRYPTION_KEY` | Optional / P1 | [src/lib/security/encryption.ts:9](file:///d:/GRABBER%20POZ%20SOLO/src/lib/security/encryption.ts#L9) | Dev random key | Per-Tenant | **YES** | **YES** ([.env.example:13](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L13)) |
| `CRON_SECRET` | **Required (Prod)** | [src/app/api/cron/process-jobs/route.ts:10](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/cron/process-jobs/route.ts#L10) | `null` (401 in prod if unset) | Per-Tenant | **YES** | **YES** ([.env.example:55](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L55)) |
| `NEXT_PUBLIC_APP_URL` | Optional | [src/lib/storefront/seo.ts:4](file:///d:/GRABBER%20POZ%20SOLO/src/lib/storefront/seo.ts#L4) | `http://localhost:3000` | Per-Tenant | NO | **YES** ([.env.example:11](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L11)) |
| `NEXT_PUBLIC_STORE_NAME` | Optional | [src/lib/config/business-settings.ts:121](file:///d:/GRABBER%20POZ%20SOLO/src/lib/config/business-settings.ts#L121) | `Grabber Business OS` | Per-Tenant | NO | **YES** ([.env.example:14](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L14)) |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | [src/app/api/storage/upload/route.ts:25](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/storage/upload/route.ts#L25) | `undefined` (falls back to local FS) | Per-Tenant | NO | **YES** ([.env.example:16](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L16)) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Optional | [scripts/validate-env.mjs:169](file:///d:/GRABBER%20POZ%20SOLO/scripts/validate-env.mjs#L169) | `undefined` | Per-Tenant | NO | **YES** ([.env.example:17](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L17)) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | [src/app/api/storage/upload/route.ts:26](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/storage/upload/route.ts#L26) | `undefined` | Per-Tenant | **YES** | **YES** ([.env.example:18](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L18)) |
| `PAYMENTS_LKR_PROVIDER` | Optional | [src/lib/payments/lkr-provider.ts:21](file:///d:/GRABBER%20POZ%20SOLO/src/lib/payments/lkr-provider.ts#L21) | `COD` | Per-Tenant | NO | **YES** ([.env.example:24](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L24)) |
| `PAYHERE_MERCHANT_ID` | Optional | [src/lib/payments/lkr-provider.ts:37](file:///d:/GRABBER%20POZ%20SOLO/src/lib/payments/lkr-provider.ts#L37) | `''` | Per-Tenant | NO | **YES** ([.env.example:29](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L29)) |
| `PAYHERE_SECRET` | Optional | [src/lib/payments/lkr-provider.ts:38](file:///d:/GRABBER%20POZ%20SOLO/src/lib/payments/lkr-provider.ts#L38) | `''` | Per-Tenant | **YES** | **YES** ([.env.example:30](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L30)) |
| `PAYHERE_MODE` | Optional | [src/lib/payments/lkr-provider.ts:39](file:///d:/GRABBER%20POZ%20SOLO/src/lib/payments/lkr-provider.ts#L39) | `'live'` | Per-Tenant | NO | **YES** ([.env.example:31](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L31)) |
| `WEBXPAY_PUBLIC_KEY` | Optional | [src/lib/payments/lkr-provider.ts:30](file:///d:/GRABBER%20POZ%20SOLO/src/lib/payments/lkr-provider.ts#L30) | `''` | Per-Tenant | NO | **YES** ([.env.example:27](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L27)) |
| `WEBXPAY_SECRET_KEY` | Optional | [src/lib/payments/lkr-provider.ts:31](file:///d:/GRABBER%20POZ%20SOLO/src/lib/payments/lkr-provider.ts#L31) | `''` | Per-Tenant | **YES** | **YES** ([.env.example:28](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L28)) |
| `WEBXPAY_ENV` | Optional | [src/lib/payments/lkr-provider.ts:27](file:///d:/GRABBER%20POZ%20SOLO/src/lib/payments/lkr-provider.ts#L27) | `'staging'` | Per-Tenant | NO | **YES** ([.env.example:26](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L26)) |
| `WHATSAPP_TOKEN` | Optional | [src/lib/integrations/whatsapp.ts:10](file:///d:/GRABBER%20POZ%20SOLO/src/lib/integrations/whatsapp.ts#L10) | `undefined` | Per-Tenant | **YES** | **YES** ([.env.example:47](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L47)) |
| `WHATSAPP_PHONE_ID` | Optional | [src/lib/integrations/whatsapp.ts:11](file:///d:/GRABBER%20POZ%20SOLO/src/lib/integrations/whatsapp.ts#L11) | `undefined` | Per-Tenant | NO | **YES** ([.env.example:48](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L48)) |
| `WHATSAPP_VERIFY_TOKEN` | Optional | [src/lib/integrations/whatsapp.ts:12](file:///d:/GRABBER%20POZ%20SOLO/src/lib/integrations/whatsapp.ts#L12) | `'grabber_dev_verify'` | Per-Tenant | **YES** | **YES** ([.env.example:49](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L49)) |
| `WHATSAPP_APP_SECRET` | Optional | [src/lib/integrations/whatsapp.ts:13](file:///d:/GRABBER%20POZ%20SOLO/src/lib/integrations/whatsapp.ts#L13) | `undefined` | Per-Tenant | **YES** | **YES** ([.env.example:51](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L51)) |
| `WHATSAPP_API_VERSION` | Optional | [src/lib/integrations/whatsapp.ts:14](file:///d:/GRABBER%20POZ%20SOLO/src/lib/integrations/whatsapp.ts#L14) | `'v21.0'` | Global | NO | **YES** ([.env.example:52](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L52)) |
| `OWNER_WHATSAPP` | Optional | [src/lib/whatsapp/inbound-handler.ts:199](file:///d:/GRABBER%20POZ%20SOLO/src/lib/whatsapp/inbound-handler.ts#L199) | `''` | Per-Tenant | NO | **YES** ([.env.example:54](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L54)) |
| `META_CONVERSIONS_API_TOKEN` | Optional | [src/lib/marketing/meta-conversions.ts:8](file:///d:/GRABBER%20POZ%20SOLO/src/lib/marketing/meta-conversions.ts#L8) | `undefined` | Per-Tenant | **YES** | **YES** ([.env.example:40](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L40)) |
| `SENTRY_DSN` | Optional | [src/lib/observability/sentry.ts:8](file:///d:/GRABBER%20POZ%20SOLO/src/lib/observability/sentry.ts#L8) | `undefined` (no-ops) | Per-Tenant / Global | NO | **YES** ([.env.example:59](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L59)) |
| `FAL_KEY` | Optional | [src/lib/creative/creative-repo.ts:87](file:///d:/GRABBER%20POZ%20SOLO/src/lib/creative/creative-repo.ts#L87) | `undefined` | Global | **YES** | **YES** ([.env.example:70](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L70)) |
| `REPLICATE_API_TOKEN` | Optional | [src/lib/creative/creative-repo.ts:88](file:///d:/GRABBER%20POZ%20SOLO/src/lib/creative/creative-repo.ts#L88) | `undefined` | Global | **YES** | **YES** ([.env.example:71](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L71)) |
| `CREATIVE_WORKER_URL` | Optional | [src/lib/creative/creative-repo.ts:84](file:///d:/GRABBER%20POZ%20SOLO/src/lib/creative/creative-repo.ts#L84) | `'http://localhost:8765'` | Global | NO | **YES** ([.env.example:68](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L68)) |
| `KOOMBIYO_API_KEY` | Optional | [src/lib/logistics/koombiyo.ts:16](file:///d:/GRABBER%20POZ%20SOLO/src/lib/logistics/koombiyo.ts#L16) | `''` | Per-Tenant | **YES** | **YES** ([.env.example:72](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L72)) |
| `CERTIFY_HTTP_BASE_URL` | Optional (Testing) | [src/lib/storefront/seo.ts:4](file:///d:/GRABBER%20POZ%20SOLO/src/lib/storefront/seo.ts#L4) | `undefined` | Per-Tenant | NO | **YES** ([.env.example:74](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L74)) |

---

## 5. Database

- **Driver & Client:** `postgres.js` (`postgres: "^3.4.5"`) wrapped with `drizzle-orm/postgres-js` at [src/db/index.ts:1-2](file:///d:/GRABBER%20POZ%20SOLO/src/db/index.ts#L1-L2).
- **Connection Pooling & Pool Size ([src/db/index.ts:22-28](file:///d:/GRABBER%20POZ%20SOLO/src/db/index.ts#L22-L28)):**
  ```typescript
  const isSupabase = isSupabaseConnection(connectionString);
  client = postgres(connectionString, {
    max: isSupabase ? 1 : 20,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false,
    ssl: isSupabase ? 'require' : undefined,
  });
  ```
  - Supabase/Transaction pooler connections: `max: 1` per serverless worker.
  - Direct PostgreSQL/VPS connections: `max: 20` pool size per container instance.
- **`DATABASE_URL` Example Targets:**
  - [.env.example:8](file:///d:/GRABBER%20POZ%20SOLO/.env.example#L8): `aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
  - [src/lib/db/connection.ts:28](file:///d:/GRABBER%20POZ%20SOLO/src/lib/db/connection.ts#L28): `postgresql://postgres:postgres@localhost:5432/grabber_business_os`
  - [Dockerfile:26](file:///d:/GRABBER%20POZ%20SOLO/Dockerfile#L26): `postgresql://postgres:postgres@localhost:5432/build_db`
- **Migration Tooling & Directory:**
  - Tooling: Drizzle Kit (`drizzle-kit: "^0.31.10"` at [drizzle.config.ts:1-24](file:///d:/GRABBER%20POZ%20SOLO/drizzle.config.ts#L1-L24)).
  - Migration Folder: `drizzle/migrations/` (15 SQL files, from `0000_clever_gateway.sql` to `0015_vertical_depth_wave_c.sql`).
  - Migration Execution Command: `npm run db:migrate` (runs `node scripts/bootstrap-db.mjs` at [scripts/bootstrap-db.mjs:1-77](file:///d:/GRABBER%20POZ%20SOLO/scripts/bootstrap-db.mjs#L1-L77)).
  - Startup Execution: **Separate step**. Migrations do NOT run automatically at container startup.
- **Seed Scripts:**
  - [scripts/seed-vertical.ts](file:///d:/GRABBER%20POZ%20SOLO/scripts/seed-vertical.ts) (`npm run seed:vertical`)
  - HTTP endpoint: [src/app/api/seed/route.ts:1-250](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/seed/route.ts#L1-L250) (POST `/api/seed` seeds default catalogs, users, settings, and inventory).
- **Table Count:** **70 tables** defined in [src/db/schema.ts](file:///d:/GRABBER%20POZ%20SOLO/src/db/schema.ts).
- **Postgres Extensions & Assumptions:**
  - Extension: `uuid-ossp` or `gen_random_uuid()` for UUID primary keys (`defaultRandom()`).
  - Search Path: Schema assumes standard `public` schema qualification (`0007_function_search_path.sql`).
  - Row Level Security (RLS): Script [scripts/apply-rls.mjs:1-120](file:///d:/GRABBER%20POZ%20SOLO/scripts/apply-rls.mjs#L1-L120) provides baseline RLS for Supabase, but `postgres.js` service connects as the superuser/postgres role which bypasses RLS on direct connections.

---

## 6. Supabase — Settle This Definitively

Search analysis for `@supabase/supabase-js`, `@supabase/ssr`, `createClient`, `.storage.from(`, and `service_role`:

- **Bucket Classification:**
  - **(a) Object Storage Only: `TRUE`**  
    Evidence: [src/app/api/storage/upload/route.ts:25-52](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/storage/upload/route.ts#L25-L52) and [src/app/api/media/route.ts:43-66](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/media/route.ts#L43-L66) perform direct HTTP `fetch()` requests to `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}` with `Authorization: Bearer ${serviceKey}`.
  - **(b) Postgres Database Host: `OPTIONAL / SUPPORTED`**  
    Evidence: [src/lib/db/connection.ts:49-55](file:///d:/GRABBER%20POZ%20SOLO/src/lib/db/connection.ts#L49-L55) inspects if `DATABASE_URL` contains `supabase.co` or `pooler.supabase.com` to apply `ssl: 'require'` and limit pool size to `1`.
  - **(c) Auth: `NOT USED AT ALL`**  
    Evidence: No Supabase Auth endpoints or libraries are invoked. Authentication uses custom HMAC-SHA256 tokens and `scrypt` password/PIN hashes ([src/lib/auth/session.ts:1-150](file:///d:/GRABBER%20POZ%20SOLO/src/lib/auth/session.ts#L1-L150)).
  - **(d) Realtime / Edge Functions: `NOT USED AT ALL`**
  - **(e) Supabase JS SDK Dependency: `NOT INSTALLED`**  
    Evidence: `@supabase/supabase-js` is `NOT FOUND` in [package.json](file:///d:/GRABBER%20POZ%20SOLO/package.json).

- **Local-Filesystem Fallback Driver for Media:**
  - **Switching Env Vars:** `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
  - **Branching Code ([src/app/api/storage/upload/route.ts:28-66](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/storage/upload/route.ts#L28-L66)):**
    ```typescript
    if (supabaseUrl && serviceKey) {
      // Direct REST upload to Supabase bucket
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': file.type },
        body: buffer,
      });
      // ...
      return NextResponse.json({ success: true, url: publicUrl, provider: 'supabase' });
    }

    // Local filesystem fallback
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.promises.mkdir(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, filename);
    await fs.promises.writeFile(filepath, buffer);
    return NextResponse.json({ success: true, url: `/uploads/${filename}`, provider: 'local' });
    ```
  - **Storage Write Scope:** Server-side using `SUPABASE_SERVICE_ROLE_KEY` (never client-side).

---

## 7. Authentication & Sessions

- **JWT / HMAC Signing Implementation:**
  - Implementation: Web Crypto API HMAC-SHA256 in Edge middleware ([src/lib/auth/session-edge.ts:38-56](file:///d:/GRABBER%20POZ%20SOLO/src/lib/auth/session-edge.ts#L38-L56)) and Node `crypto.createHmac('sha256')` in Node runtime ([src/lib/auth/session.ts:31-33](file:///d:/GRABBER%20POZ%20SOLO/src/lib/auth/session.ts#L31-L33)).
  - Secret Env Var: `AUTH_SECRET` (fallbacks: `NEXTAUTH_SECRET`, `SESSION_SECRET`).
  - **Hardcoded Fallback in Code ([src/lib/auth/session.ts:16-24](file:///d:/GRABBER%20POZ%20SOLO/src/lib/auth/session.ts#L16-L24)):**
    ```typescript
    function authSecret(): string {
      const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
      if (!s) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('AUTH_SECRET is required in production');
        }
        return 'dev-only-insecure-auth-secret-change-me';
      }
      return s;
    }
    ```
- **Cookie Names & Attributes:**
  - Staff Cookie: `grabber_session` ([src/lib/auth/session-constants.ts:1](file:///d:/GRABBER%20POZ%20SOLO/src/lib/auth/session-constants.ts#L1)).
  - Customer Cookie: `grabber_customer_session` ([src/lib/auth/session-constants.ts:2](file:///d:/GRABBER%20POZ%20SOLO/src/lib/auth/session-constants.ts#L2)).
  - Max Age: Staff = 12 hours (43,200s); Customer = 30 days (2,592,000s).
  - Flags: `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure: process.env.NODE_ENV === 'production'` ([src/lib/auth/session.ts:101-107](file:///d:/GRABBER%20POZ%20SOLO/src/lib/auth/session.ts#L101-L107)).
  - Domain Scoping: Unset (defaults to host domain from request).
- **Parallel Auth Systems:** NO. Both staff and shopper auth use the same HMAC token signing mechanism and `scrypt` hashing algorithm with separate cookie names.
- **Staff Roles & Enforcement:**
  - Roles: `OWNER`, `ADMIN`, `MANAGER`, `CASHIER`, `WAREHOUSE`, `ACCOUNTANT`, `MARKETING` ([src/lib/auth/session-edge.ts:8-15](file:///d:/GRABBER%20POZ%20SOLO/src/lib/auth/session-edge.ts#L8-L15)).
  - Enforcement Points:
    - Route surface gate in [src/middleware.ts:161-179](file:///d:/GRABBER%20POZ%20SOLO/src/middleware.ts#L161-L179).
    - Per-handler mutation guard via `requireStaffSession()` and `assertCanMutateCommerce()` ([src/lib/auth/session.ts:124-145](file:///d:/GRABBER%20POZ%20SOLO/src/lib/auth/session.ts#L124-L145)).
    - Branch-level scoping via `assertStaffBranchAccess()` ([src/lib/auth/branch-authorization.ts:60-120](file:///d:/GRABBER%20POZ%20SOLO/src/lib/auth/branch-authorization.ts#L60-L120)).

---

## 8. Statefulness — What Breaks with N Containers

- **Local Filesystem Writes at Runtime:**
  - `public/uploads/`: When Supabase is not configured ([src/app/api/storage/upload/route.ts:55-60](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/storage/upload/route.ts#L55-L60)). Multiple containers without a shared volume mount will have partitioned local media.
- **In-Memory Caches / Maps / Singletons:**
  - Rate Limiter: [src/lib/security/rate-limit.ts:8](file:///d:/GRABBER%20POZ%20SOLO/src/lib/security/rate-limit.ts#L8) (`const buckets = new Map<string, Bucket>()`). Holds per-IP request counters in memory. Does not sync across containers.
- **WebSockets / SSE / Long-Polling:**
  - `WebSockets`: `NOT FOUND` in application code.
  - `SSE (Server-Sent Events)`: `NOT FOUND` in application code.
  - `Long-Polling`: `NOT FOUND` in application code.
- **Background Jobs, Queues & Double-Firing:**
  - Job Outbox Engine: [src/lib/jobs/outbox.ts:48-67](file:///d:/GRABBER%20POZ%20SOLO/src/lib/jobs/outbox.ts#L48-L67). Uses PostgreSQL optimistic locking (`UPDATE job_outbox SET status = 'PROCESSING', locked_at = now, locked_by = workerId WHERE id = job.id AND status = 'PENDING' RETURNING *`).
  - **Double-Fire Protection:** **SAFE**. If multiple containers hit `/api/cron/process-jobs` simultaneously, PostgreSQL row-level updates prevent two workers from processing the same job.
- **Sticky Session Assumptions:**
  - None. Auth cookies are self-contained HMAC tokens verified statelessly via `AUTH_SECRET`.

---

## 9. External Integrations

### Inbound Webhook Endpoints & Signature Verifications

| Webhook Route Path | Handler File Citation | Signature Verification Method | Callback URL Derivation |
| :--- | :--- | :--- | :--- |
| `/api/webhooks/payhere` | [src/app/api/webhooks/payhere/route.ts:1-75](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/webhooks/payhere/route.ts#L1-L75) | MD5 checksum hash verification ([src/lib/payments/payhere-signature.ts:16-25](file:///d:/GRABBER%20POZ%20SOLO/src/lib/payments/payhere-signature.ts#L16-L25)) | Derived from `NEXT_PUBLIC_APP_URL` at [src/lib/payments/payhere/client.ts:42](file:///d:/GRABBER%20POZ%20SOLO/src/lib/payments/payhere/client.ts#L42) |
| `/api/webhooks/webxpay` | [src/app/api/webhooks/webxpay/route.ts:1-78](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/webhooks/webxpay/route.ts#L1-L78) | RSA Public Key Decryption / Verification ([src/lib/payments/webxpay/webhook.ts:25-50](file:///d:/GRABBER%20POZ%20SOLO/src/lib/payments/webxpay/webhook.ts#L25-L50)) | Derived from `NEXT_PUBLIC_APP_URL` at [src/lib/payments/webxpay/client.ts:23](file:///d:/GRABBER%20POZ%20SOLO/src/lib/payments/webxpay/client.ts#L23) |
| `/api/webhooks/whatsapp` | [src/app/api/webhooks/whatsapp/route.ts:1-85](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/webhooks/whatsapp/route.ts#L1-L85) | GET: `hub.verify_token === WHATSAPP_VERIFY_TOKEN`<br>POST: HMAC-SHA256 (`x-hub-signature-256`) via `WHATSAPP_APP_SECRET` ([src/lib/integrations/whatsapp.ts:74-89](file:///d:/GRABBER%20POZ%20SOLO/src/lib/integrations/whatsapp.ts#L74-L89)) | Configured manually in Meta Developer Console (Fixed URL) |
| `/api/whatsapp/webhook` | [src/app/api/whatsapp/webhook/route.ts:1-55](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/whatsapp/webhook/route.ts#L1-L55) | Same as above (Alias route for Meta verification) | Configured manually in Meta Developer Console (Fixed URL) |

- **Fixed Callback URL Constraint:** Meta WhatsApp Cloud API webhooks require a fixed domain URL registered in the Meta App Dashboard. For multi-tenant instances on separate domains, either separate Meta Apps are required per tenant or an edge router webhook dispatcher must be used.

---

## 10. Hardware & Local-Device Dependencies

- **Thermal Receipt Printing (80mm & 58mm):**
  - WebBluetooth: Browser `navigator.bluetooth.requestDevice` ([src/lib/hardware/printer.ts:189-217](file:///d:/GRABBER%20POZ%20SOLO/src/lib/hardware/printer.ts#L189-L217)).
  - WebUSB: Browser `navigator.usb.requestDevice` ([src/lib/hardware/printer.ts:222-243](file:///d:/GRABBER%20POZ%20SOLO/src/lib/hardware/printer.ts#L222-L243)).
  - Browser Print: `window.print()` targeting `#printable-thermal-receipt` with CSS print resets ([src/app/globals.css:294-340](file:///d:/GRABBER%20POZ%20SOLO/src/app/globals.css#L294-L340)).
  - **Server Constraint:** **NONE**. Pure client-side browser API execution. The server never communicates with physical printers directly over raw TCP/IP or LAN sockets.
- **Barcode Scanner Input:**
  - Browser listener: [src/lib/hardware/scanner.ts:35-75](file:///d:/GRABBER%20POZ%20SOLO/src/lib/hardware/scanner.ts#L35-L75) (`BarcodeScannerListener`). Intercepts HID keystrokes on `window`.
  - **Server Constraint:** **NONE**. Pure client-side browser keyboard event capture.
- **Cash Drawer Kick Pulse:**
  - Generates binary pulse sequence `\x1B\x70\x00\x19\xFA` sent via WebUSB/Bluetooth or attached to thermal print buffer ([src/lib/hardware/printer.ts:108](file:///d:/GRABBER%20POZ%20SOLO/src/lib/hardware/printer.ts#L108)).
  - **Server Constraint:** **NONE**. Pure client-side.
- **Barcode & Price Sticker Label Printing:**
  - Generates vector Code128 SVG barcodes via `jsbarcode` in browser DOM and triggers `window.print()` with `@page { size: 50mm 30mm; margin: 0; }` ([src/app/barcodes/page.tsx:112-280](file:///d:/GRABBER%20POZ%20SOLO/src/app/barcodes/page.tsx#L112-L280)).
  - **Server Constraint:** **NONE**. Pure client-side.

---

## 11. Multi-Tenancy Signals Already in the Code

- **Tenant Scoping Model:** **Database-per-Tenant Isolation**.
  - There is NO `tenant_id` or `organization_id` column across core database tables in [src/db/schema.ts](file:///d:/GRABBER%20POZ%20SOLO/src/db/schema.ts).
  - Every tenant instance is designed to connect to its own isolated PostgreSQL database via `DATABASE_URL`.
- **Physical Locations Scoping:** Multi-branch/warehouse scoping exists within a tenant's database via `branchId` / `warehouseId` on inventory and shift records ([src/db/schema.ts:18-21](file:///d:/GRABBER%20POZ%20SOLO/src/db/schema.ts#L18-L21), [src/lib/auth/branch-authorization.ts:1-120](file:///d:/GRABBER%20POZ%20SOLO/src/lib/auth/branch-authorization.ts#L1-L120)).
- **Host Header Decision Logic:**
  - [src/lib/security/rate-limit.ts:29-33](file:///d:/GRABBER%20POZ%20SOLO/src/lib/security/rate-limit.ts#L29-L33) inspects `x-forwarded-for` and `x-real-ip`.
  - Dynamic SEO metadata uses request headers or `NEXT_PUBLIC_APP_URL` fallback ([src/lib/storefront/seo.ts:4-8](file:///d:/GRABBER%20POZ%20SOLO/src/lib/storefront/seo.ts#L4-L8)).

---

## 12. Operational Surface

- **Health-Check Endpoints:**
  1. `/api/health` ([src/app/api/health/route.ts:1-50](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/health/route.ts#L1-L50)): Public probe for reverse proxies/load balancers. Executes `SELECT 1 AS ok` against PostgreSQL and returns `{ ok: true, service: 'grabber-poz-solo', sentry: '...', db: 'connected' }`. Returns HTTP 503 if DB fails.
  2. `/api/ops/health` ([src/app/api/ops/health/route.ts:1-58](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/ops/health/route.ts#L1-L58)): Authenticated staff ops probe reporting dead jobs count, failed webhook events, and inventory drift.
  3. `/api/integrations/health` ([src/app/api/integrations/health/route.ts:1-120](file:///d:/GRABBER%20POZ%20SOLO/src/app/api/integrations/health/route.ts#L1-L120)): Authenticated integration status checker (WhatsApp, Supabase storage, Payment providers, Sentry).
- **Logging & Error Tracking:**
  - Application logging: Structured `console.log` / `console.error` logs.
  - Sentry: Initialized via `@sentry/nextjs` in `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and [src/lib/observability/sentry.ts:1-35](file:///d:/GRABBER%20POZ%20SOLO/src/lib/observability/sentry.ts#L1-L35). Disabled cleanly when `SENTRY_DSN` is absent.
- **Existing Dockerfile ([Dockerfile:1-59](file:///d:/GRABBER%20POZ%20SOLO/Dockerfile#L1-L59)):**
  ```dockerfile
  FROM node:20-alpine AS base
  WORKDIR /app
  RUN apk add --no-cache libc6-compat

  FROM base AS deps
  WORKDIR /app
  COPY package.json package-lock.json ./
  ENV NODE_ENV=development
  RUN npm ci --include=dev

  FROM base AS builder
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  ENV NEXT_TELEMETRY_DISABLED=1
  ENV NODE_ENV=production
  ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/build_db"
  ENV NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
  ENV NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder"
  ENV AUTH_SECRET="build_time_placeholder_secret_32chars_long_minimum"
  ENV CRON_SECRET="build_time_placeholder_cron_secret"
  RUN npm run build

  FROM node:20-alpine AS runner
  WORKDIR /app
  ENV NODE_ENV=production
  ENV PORT=3000
  ENV HOSTNAME="0.0.0.0"
  RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
  COPY --from=builder --chown=nextjs:nodejs /app/public ./public
  COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
  COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
  RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public
  USER nextjs
  EXPOSE 3000
  CMD ["node", "server.js"]
  ```
- **Test Suite Status:** **514 passed across 79 test files** (`npm test` in Vitest).
- **TypeScript Typecheck:** Clean (Exit code 0 from `tsc --noEmit`).
- **Build Output Size:**
  - First Load JS shared by all routes: **184 kB**.
  - Total Routes: 219 static, dynamic, and API routes.
  - Standalone artifact: Compact standalone output in `.next/standalone`.
- **Heaviest Dependencies:**
  - `@sentry/nextjs`: `^10.73.0`
  - `framer-motion`: `^12.4.7`
  - `drizzle-orm`: `^0.45.2` / `postgres`: `^3.4.5`
  - `better-sqlite3`: `^11.8.1` (used for local offline dev tests)
  - `pdf-lib`: `^1.17.1`
  - `jsbarcode`: `^3.12.3`

---

## SUMMARY DEPLOYMENT ARCHITECTURE

```
                                  [ Shared VPS Host ]
                                           │
                       ┌───────────────────┴───────────────────┐
                       │   Nginx / Traefik Reverse Proxy       │
                       │   SSL Termination (Let's Encrypt)     │
                       └───────────────────┬───────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         │                                 │                                 │
         ▼                                 ▼                                 ▼
┌─────────────────┐               ┌─────────────────┐               ┌─────────────────┐
│ Container 1     │               │ Container 2     │               │ Container 3     │
│ (Demo Instance) │               │ (Client A Prod) │               │ (Client B Prod) │
│ grabber.lk      │               │ client-a.com    │               │ client-b.com    │
├─────────────────┤               ├─────────────────┤               ├─────────────────┤
│ Shared Image:   │               │ Shared Image:   │               │ Shared Image:   │
│ grabber-os:1.0  │               │ grabber-os:1.0  │               │ grabber-os:1.0  │
│ Port: 3001      │               │ Port: 3002      │               │ Port: 3003      │
├─────────────────┤               ├─────────────────┤               ├─────────────────┤
│ Env:            │               │ Env:            │               │ Env:            │
│ DATABASE_URL=   │               │ DATABASE_URL=   │               │ DATABASE_URL=   │
│   db_demo       │               │   db_client_a   │               │   db_client_b   │
│ AUTH_SECRET=k1  │               │ AUTH_SECRET=k2  │               │ AUTH_SECRET=k3  │
└────────┬────────┘               └────────┬────────┘               └────────┬────────┘
         │                                 │                                 │
         ▼                                 ▼                                 ▼
┌─────────────────┐               ┌─────────────────┐               ┌─────────────────┐
│ PostgreSQL      │               │ PostgreSQL      │               │ PostgreSQL      │
│ Database:       │               │ Database:       │               │ Database:       │
│ grabber_demo    │               │ client_a_prod   │               │ client_b_prod   │
└─────────────────┘               └─────────────────┘               └─────────────────┘
```
