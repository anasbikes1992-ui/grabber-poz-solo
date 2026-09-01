# Vercel Environment Variables

Checklist for **Grabber Poz Solo**. Deploy flow: [`FRESH_START.md`](./FRESH_START.md)

---

## Required (manual)

| Variable | Notes |
|----------|--------|
| `AUTH_SECRET` | Session signing |
| `MASTER_ENCRYPTION_KEY` | Encrypts secrets saved in Settings |
| **`DATABASE_URL`** | **Pooler URL (port 6543)** — app will not load catalog without this |
| `NEXT_PUBLIC_APP_URL` | e.g. `https://grabber-poz-solo.vercel.app` |
| `NEXT_PUBLIC_STORE_NAME` | Store display name |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — dashboard → API |

> **If `/api/health` shows `"db": "not_configured"`** — you are missing `DATABASE_URL` (or Supabase integration `POSTGRES_URL`). The storefront catalog will fail until this is set and you redeploy.

### How to get `DATABASE_URL`

Supabase → [Database Settings](https://supabase.com/dashboard/project/rbayhrskowtahepwccrq/settings/database) → **Connection string** → **URI** → **Transaction pooler**:

```text
postgresql://postgres.rbayhrskowtahepwccrq:[YOUR_DB_PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Use the password from **Database → Reset database password** (must match what you paste in the URI).

## Auto (Supabase ↔ Vercel integration only)

If you connect Supabase in Vercel **Integrations**, these may appear instead of manual `DATABASE_URL`:

| Variable | Notes |
|----------|--------|
| `POSTGRES_URL` | Same as pooler `DATABASE_URL` |
| `POSTGRES_URL_NON_POOLING` | Direct :5432 — migrations only, not required on Vercel |

---

## Marketing pixels — optional

**Two ways to configure** (DB wins when set):

1. **Vercel env** — good for first deploy before seed
2. **Staff UI** [`/marketing`](/marketing) — saved to `business_config` (recommended long-term)

| Variable | Wired? | Notes |
|----------|--------|-------|
| `NEXT_PUBLIC_META_PIXEL_ID` | ✅ | Injected on storefront |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | ✅ | GA4 `gtag` (skipped if GTM set) |
| `NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID` | ✅ | GTM container |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | ✅ | TikTok pixel |
| `META_CONVERSIONS_API_TOKEN` | ❌ not yet | Server-side CAPI — reserved, no route yet |

**Skip on Vercel if** you configure pixels only via `/marketing` after login.

---

## LKR payments — optional

**Current storefront checkout:** COD only (`/shop/checkout`).  
**Do not add payment keys until** you enable online LKR checkout.

| Variable | Wired? | Notes |
|----------|--------|-------|
| `PAYMENTS_LKR_PROVIDER` | ⚙️ config | `WEBXPAY` or `PAYHERE` |
| `WEBXPAY_ENV` | ⚙️ | `staging` or `live` |
| `WEBXPAY_PUBLIC_KEY` / `WEBXPAY_SECRET_KEY` | ⚙️ | WebXPay gateway |
| `PAYHERE_MERCHANT_ID` / `PAYHERE_SECRET` | ✅ webhook | `/api/webhooks/payhere` verifies signatures |
| `PAYHERE_MODE` | ⚙️ | `sandbox` or `live` |

PayHere secrets can also be saved encrypted via **Settings → Integrations** (DB). Env is used for webhooks when set.

---

## Global payments — optional (future)

| Variable | Wired? |
|----------|--------|
| `STRIPE_SECRET_KEY` | ❌ checkout not wired |
| `STRIPE_WEBHOOK_SECRET` | ❌ no Stripe webhook route |

Schema supports `STRIPE` tender type on POS; online Stripe checkout is not implemented.

---

## Other optional integrations

| Variable | Wired? | Notes |
|----------|--------|-------|
| `WHATSAPP_VERIFY_TOKEN` | ✅ webhook | Meta webhook challenge at `/api/integrations/whatsapp` |
| `WHATSAPP_TOKEN` | ⚙️ | Outbound API |
| `WHATSAPP_PHONE_ID` | ⚙️ | WhatsApp Business phone |
| `KOOMBIYO_API_KEY` | ⚙️ | Courier integration |
| `CERTIFY_HTTP_BASE_URL` | ⚙️ | Release certification scripts |
| `FAL_KEY` | ⚙️ | Creative engine |

`npm run ops:sync-env` pushes all set values from `.env.local` to **production + preview**.

---

## Sync & verify

```powershell
$env:VERCEL_PROJECT="grabber-poz-solo"
npm run ops:sync-env
```

After deploy:

1. `GET /api/health` → `"db": "connected"`
2. View storefront source — pixel scripts present when IDs configured
3. `POST /api/seed` once if DB is empty

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Pixels missing | Set env vars **or** save IDs at `/marketing` |
| PayHere webhook 400 | `PAYHERE_SECRET` must match PayHere dashboard |
| Payment env unused | Expected — online checkout not live yet |
