# Fresh Start — New Supabase + Vercel

Step-by-step guide to deploy **Grabber Business OS (Solo)** on a **new** Supabase database and **new** Vercel project. No legacy `db:push` — use numbered migrations only.

Last updated: 2026-09-01

---

## What you get

| Surface | URL |
|---------|-----|
| Storefront | `/` |
| Staff login | `/login` → `/app` |
| POS | `/pos` |
| Shopper checkout | `/shop/checkout` |

Schema SSOT: `src/db/schema.ts` · Migrations: `drizzle/migrations/0000` → `0002`

---

## Phase 1 — Supabase (new project)

### 1. Create project

1. [Supabase Dashboard](https://supabase.com/dashboard) → **New project**
2. Region: **`ap-southeast-1`** (Singapore — closest to LK)
3. Save the **database password** (you cannot recover it later)
4. Wait until the project is **Active**

### 2. Connection strings

In **Project Settings → Database**:

| Use | Host | Port | Notes |
|-----|------|------|-------|
| **App / Vercel** | `aws-0-ap-southeast-1.pooler.supabase.com` | `6543` | Transaction pooler + `?pgbouncer=true` |
| **Migrations (local only)** | `db.<ref>.supabase.co` | `5432` | Direct connection |

Pooler URL format:

```text
postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Direct URL (for local bootstrap only):

```text
postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres
```

Also copy from **Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://<PROJECT_REF>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only — never expose to client bundles)

### 3. Local env file

```bash
cp .env.example .env.local
```

Fill `.env.local`:

```env
DATABASE_URL=postgresql://postgres.<REF>:<PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
# For bootstrap only, temporarily use direct URL if pooler fails on DDL:
# DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<REF>.supabase.co:5432/postgres

NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_SECRET=<openssl rand -hex 48>
MASTER_ENCRYPTION_KEY=<openssl rand -hex 32>
NEXT_PUBLIC_STORE_NAME=Your Store Name

NEXT_PUBLIC_SUPABASE_URL=https://<REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>
SUPABASE_SERVICE_ROLE_KEY=<service_role>

WHATSAPP_VERIFY_TOKEN=<random string for webhook verify>
```

Generate secrets (PowerShell):

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Phase 2 — Database bootstrap

**Never use `npm run db:push` in production.** Use migration bootstrap:

```bash
npm run env:validate
npm run db:bootstrap
```

Optional RLS + SQL certification:

```bash
npm run db:bootstrap -- --rls
npm run db:apply-rls
npm run db:test-rls
npm run client:certify
```

### Seed demo data (dev)

```bash
npm run dev
```

In another terminal:

```bash
curl -X POST http://localhost:3000/api/seed ^
  -H "Content-Type: application/json" ^
  -d "{\"storeName\":\"My Store\",\"slug\":\"my-store\",\"ownerPin\":\"1234\"}"
```

Verify:

```bash
npm run check
npm run client:certify:http
```

---

## Phase 3 — Vercel (new project)

### 1. Create & link project

```bash
npx vercel login
npx vercel link
```

When prompted:

- **Create new project** (do not reuse `grabber-business-os` unless intentional)
- Framework: **Next.js**
- Root: `.`

### 2. Set production env

Either dashboard (**Settings → Environment Variables**) or CLI:

```bash
# Set VERCEL_PROJECT in .env.local to your new project slug, then:
npm run ops:sync-env
```

Or manually add the same keys as `.env.local`, with:

- `NEXT_PUBLIC_APP_URL` = your Vercel URL (e.g. `https://my-store-xyz.vercel.app`)
- `DATABASE_URL` = **pooler** URL with `pgbouncer=true`

### 3. Deploy

```bash
npx vercel --prod
```

Post-deploy:

1. Open `https://<your-app>/api/health` → should return `{ success: true }`
2. Seed production once (owner-authenticated or temporary `AUTH_OPTIONAL=true` — rotate after)
3. Run HTTP cert against production:

```bash
set CERTIFY_HTTP_BASE_URL=https://<your-app>.vercel.app
npm run client:certify:http
```

---

## Phase 4 — Custom domain (optional)

1. Vercel → **Domains** → add `shop.yourdomain.lk`
2. Update DNS CNAME to Vercel
3. Set `NEXT_PUBLIC_APP_URL=https://shop.yourdomain.lk` in Vercel env
4. Redeploy

---

## Provision packet generator

Generates a client-specific env template + runbook under `reports/`:

```bash
npm run client:provision -- --client "Urban Trendz" --slug "urban-trendz" --domain "shop.urbantrendz.lk"
```

---

## Route map (after cleanup)

### Public (no staff login)

- `/`, `/store` (redirect), `/products/[slug]`, `/categories/[slug]`
- `/shop/login`, `/shop/checkout`, `/shop/account`

### Staff (login required in production)

- Hub: `/app` · POS: `/pos` · Catalog: `/products`
- Store builder: `/store/builder` (staff-only — not public)
- Intelligence: `/approvals`, `/settings/automation`, `/ai/agents`, `/ai/demand`

### Removed / redirected (legacy mocks)

| Old path | Redirect |
|----------|----------|
| `/collections` | `/products` |
| `/wholesale` | `/quotations` |
| `/setup` | `/settings` |
| `/accounts` | `/reports` |
| `/dashboard` | `/app` |

### Kept for future wiring (mock UI, API exists)

- `/whatsapp`, `/creative`, `/delivery`, `/barcodes`

---

## Next engineering steps (post fresh deploy)

1. **Wire Jarvis drawer** → `POST /api/jarvis/chat` (replace client mock)
2. **Wire WhatsApp page** → templates API + send integration
3. **Live WhatsApp** — set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` on Vercel
4. **Lighthouse** — product + checkout performance budgets
5. **DB-06** — drop legacy column bridges after backfill verification
6. **R6 agents + creative** — replace stub orchestrator with approval workflow

See [`ROADMAP.md`](./ROADMAP.md) and [`RELEASE_GATE.md`](./RELEASE_GATE.md).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Bootstrap fails on pooler | Temporarily use **direct** `DATABASE_URL`, run bootstrap, switch back to pooler |
| `Unauthorized` on APIs in prod | Staff cookie missing — login at `/login` |
| Store builder 404 in prod | Ensure `/store/builder` in middleware staff list (fixed in cleanup) |
| Seed fails | Check `DATABASE_URL`, run `npm run db:bootstrap` first |
| Vercel build OK but DB errors | Pooler URL missing `?pgbouncer=true` |

---

## Related

- [`correction.md`](./correction.md) — sprint tracker
- [`IMPLEMENTATION_MAP.md`](./IMPLEMENTATION_MAP.md) — feature ↔ code map
- [`.env.example`](../.env.example) — env template
