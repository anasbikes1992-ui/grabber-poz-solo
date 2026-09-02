# Environment Variables (Grabber Business OS)

Checklist for **any host**: Grabber Managed **VPS** (default) or Vercel.  
**VPS procedure:** [`VPS_DEPLOY.md`](./VPS_DEPLOY.md) · **Commercial:** [`COMMERCIAL_MODEL.md`](./COMMERCIAL_MODEL.md)

Filename `VERCEL_ENV.md` is historical — variables apply on VPS too.

---

## Required (manual) — P0

| Variable | Notes |
|----------|--------|
| `AUTH_SECRET` | Session signing (≥32 chars in production) |
| `MASTER_ENCRYPTION_KEY` | Encrypts secrets in Settings |
| **`DATABASE_URL`** | Dedicated Postgres (VPS local or Supabase pooler `:6543`) |
| `NEXT_PUBLIC_APP_URL` | Public HTTPS URL |
| `NEXT_PUBLIC_STORE_NAME` | Store display name |

### Supabase API keys (if using Supabase URL/storage)

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |

> **If `/api/health` shows `"db": "not_configured"`** — set `DATABASE_URL` and restart the app.

### How to get `DATABASE_URL`

**On Grabber VPS (Postgres local):**

```text
postgresql://grabber_USER:PASSWORD@127.0.0.1:5432/grabber_DB
```

**On Supabase (optional):** Project Settings → Database → Transaction pooler port **6543**:

```text
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Never hardcode a shared demo project ref into client production docs.

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
2. **Staff UI** [`/social`](/social) (Channels & Pixels tab; `/marketing` redirects here) — saved to `business_config`

| Variable | Wired? | Notes |
|----------|--------|-------|
| `NEXT_PUBLIC_META_PIXEL_ID` | ✅ | Injected on storefront |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | ✅ | GA4 `gtag` (skipped if GTM set) |
| `NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID` | ✅ | GTM container |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | ✅ | TikTok pixel |
| `META_CONVERSIONS_API_TOKEN` | ✅ CAPI | Server-side `Purchase` on checkout (`meta-capi.ts`) |

**Skip on Vercel if** you configure pixels only via `/social` after login.

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
| `WHATSAPP_VERIFY_TOKEN` | ✅ webhook | Meta challenge at **`/api/whatsapp/webhook`** (alias: `/api/webhooks/whatsapp`) |
| `WHATSAPP_TOKEN` | ✅ send | Outbound Cloud API (alias: `WHATSAPP_ACCESS_TOKEN`) |
| `WHATSAPP_PHONE_ID` | ✅ send | Phone number ID (alias: `WHATSAPP_PHONE_NUMBER_ID`) |
| `WHATSAPP_APP_SECRET` | ✅ webhook + send | Validates inbound `X-Hub-Signature-256`; **required for outbound** when Meta app has *Require App Secret* (adds `appsecret_proof` to Graph API calls) |
| `WHATSAPP_API_VERSION` | ✅ send | Graph API version (default `v21.0`) |
| **`NEXT_PUBLIC_WHATSAPP_NUMBER`** | ✅ storefront | **Customer-facing wa.me link** (E.164, e.g. `947XXXXXXXX`) — replaces demo `94771234567` |
| `KOOMBIYO_API_KEY` | ⚙️ | Courier integration |
| `CERTIFY_HTTP_BASE_URL` | ⚙️ | Release certification scripts |
| `FAL_KEY` / `REPLICATE_API_TOKEN` | ⚙️ | Creative image fallback (optional) |
| `CREATIVE_WORKER_URL` | ⚙️ | GPU video worker base URL (**not** on Vercel) |
| `CRON_SECRET` | ⚙️ | Bearer for `/api/cron/process-jobs` (VPS crontab or Vercel cron) |

---

## Observability — Sentry (recommended on VPS)

| Variable | Notes |
|----------|--------|
| `SENTRY_DSN` | Server/edge DSN (Grabber ops project) |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser (can match server DSN) |
| `SENTRY_ENVIRONMENT` | e.g. `production`, `staging`, `client-slug` |
| `SENTRY_RELEASE` | git sha or `grabber@1.0.0` |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Optional; source maps upload on CI |

App runs without Sentry if DSN unset. Health returns `"sentry":"configured"|"off"`.

---

## Sync & verify

**VPS:** set env in `/etc/grabber/[slug].env`, restart unit — see [`VPS_DEPLOY.md`](./VPS_DEPLOY.md).

**Vercel (optional):**

```powershell
$env:VERCEL_PROJECT="grabber-poz-solo"
npm run ops:sync-env
```

After deploy:

1. `GET /api/health` → `"db": "connected"`, `"sentry":"configured"` when DSN set  
2. Trigger a test error or use POS → confirm event in Sentry  
3. `POST /api/seed` once if DB is empty  

**Meta webhook:** `https://[YOUR_DOMAIN]/api/whatsapp/webhook` + `WHATSAPP_VERIFY_TOKEN`; subscribe `messages`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Pixels missing | Set env vars **or** save IDs at `/social` |
| PayHere webhook 400 | `PAYHERE_SECRET` must match PayHere dashboard |
| Payment env unused | Expected — online checkout not live yet |
| Sentry silent | Set both DSN vars; rebuild so client bundle picks up `NEXT_PUBLIC_*` |
