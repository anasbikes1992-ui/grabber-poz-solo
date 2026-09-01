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

## Phase 3 — Payments, WhatsApp, marketing env (IN PROGRESS)

| Step | Status |
|------|--------|
| WhatsApp env on Vercel (`WHATSAPP_*`) | DONE (user) |
| Live send via Graph API (`sendWhatsAppText`) | DONE |
| Webhook `/api/webhooks/whatsapp` + signature verify | DONE |
| `ORDER_CREATED` → WhatsApp automation (storefront + phone) | DONE |
| Marketing pixels env or `/marketing` UI | Optional |
| LKR online checkout (PayHere/WebXPay) | TODO — storefront COD today |

---

## Phase 4 — RLS + release gate (IN PROGRESS)

| Step | Status |
|------|--------|
| `npm run db:apply-rls` on production Supabase | DONE (2026-09-01) |
| `npm run db:test-rls` | Run locally with pooler `DATABASE_URL` |
| `npm run release:gate-r1` before deploy | TODO each release |
| `npm run db:bootstrap -- --rls --certify` on fresh project | TODO for new clients |
| Rotate `TEMP$` owner PIN after first login | TODO |
| [`RELEASE_GATE.md`](./RELEASE_GATE.md) sign-off | IN PROGRESS |

**Exit criteria:** Fresh DB → bootstrap → seed → certify → RLS applied → owner PIN rotated → pilot in [`certification/CLIENT_ACCEPTANCE_TEST.md`](./certification/CLIENT_ACCEPTANCE_TEST.md).
