# Grabber Poz Solo — Next Phases

Deployment and feature rollout plan after initial Vercel + Supabase go-live.

**Related:** [`FRESH_START.md`](./FRESH_START.md) · [`VERCEL_ENV.md`](./VERCEL_ENV.md) · [`ROADMAP.md`](./ROADMAP.md)

---

## Phase 1 — Deploy + DB (DONE)

| Step | Status |
|------|--------|
| Supabase project (ap-southeast-1) | DONE |
| `npm run db:bootstrap` migrations | DONE |
| Vercel project `grabber-poz-solo` linked | DONE |
| `DATABASE_URL` pooler on Vercel | DONE |
| `GET /api/health` → `"db": "connected"` | DONE |

---

## Phase 2 — Admin at `/adminpoz` + seed owner (DONE)

| Step | Status |
|------|--------|
| Staff login moved to `/adminpoz` (not linked from storefront) | DONE |
| `/login` redirects to `/adminpoz` | DONE |
| `robots.txt` disallows `/adminpoz` and `/login` | DONE |
| `POST /api/seed` for demo catalog + COA | DONE |
| Owner user in `users` table (PIN `1234`, email `owner@store.local`) | DONE |
| Storefront stone/gold theme + motion | DONE |

**Owner seed (one-time):**

```powershell
curl -X POST https://grabber-poz-solo.vercel.app/api/seed `
  -H "Content-Type: application/json" `
  -d '{"storeName":"Grabber Poz Solo","slug":"solo","ownerPin":"1234"}'
```

**Staff login:** bookmark `/adminpoz` · email `owner@store.local` · PIN `1234` (rotate on first login).

---

## Phase 3 — Payments, WhatsApp, marketing env (TODO)

Optional env vars — sync via `npm run ops:sync-env` (preview + production):

| Area | Variables |
|------|-----------|
| LKR payments | `PAYMENTS_LKR_PROVIDER`, `WEBXPAY_*`, `PAYHERE_*` |
| Global payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Marketing pixels | `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`, `NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID`, `NEXT_PUBLIC_TIKTOK_PIXEL_ID`, `META_CONVERSIONS_API_TOKEN` |
| WhatsApp | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN` |
| Logistics | `KOOMBIYO_API_KEY` |
| Certify | `CERTIFY_HTTP_BASE_URL` |

Storefront checkout remains **COD** until Phase 3 payment wiring is complete.

---

## Phase 4 — RLS + release gate (TODO)

| Step | Status |
|------|--------|
| `npm run db:apply-rls` on production Supabase | TODO |
| `npm run db:test-rls` | TODO |
| `npm run client:certify` against live URL | TODO |
| Rotate `TEMP$` owner PIN after first login | TODO |
| [`RELEASE_GATE.md`](./RELEASE_GATE.md) sign-off | TODO |

**Exit criteria:** Fresh DB → bootstrap → seed → certify → RLS applied → owner PIN rotated → pilot in [`certification/CLIENT_ACCEPTANCE_TEST.md`](./certification/CLIENT_ACCEPTANCE_TEST.md).
