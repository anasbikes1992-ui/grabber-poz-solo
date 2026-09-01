# Grabber Poz Solo — Next Phases

Deployment and feature rollout plan after initial Vercel + Supabase go-live.

**Related:** [`FRESH_START.md`](./FRESH_START.md) · [`VERCEL_ENV.md`](./VERCEL_ENV.md) · [`ROADMAP.md`](./ROADMAP.md) · [`RELEASE_GATE.md`](./RELEASE_GATE.md)

**Latest gate run:** [`reports/RELEASE_GATE_RUN_2026-09-01.md`](../reports/RELEASE_GATE_RUN_2026-09-01.md)

---

## Phase 1 — Deploy + DB (DONE)

| Step | Status |
|------|--------|
| Supabase project `rbayhrskowtahepwccrq` (ap-southeast-1) | DONE |
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

**Staff login:** bookmark `/adminpoz` · email `owner@store.local` · PIN `1234` (**rotate on first login**).

---

## Phase 3 — Payments, WhatsApp, marketing env (MOSTLY DONE)

| Step | Status |
|------|--------|
| WhatsApp env on Vercel (`WHATSAPP_*`) | DONE |
| Live send via Graph API (`sendWhatsAppText`) | DONE |
| Webhook `/api/webhooks/whatsapp` + signature verify | DONE |
| `ORDER_CREATED` → WhatsApp automation (storefront + phone) | DONE |
| Meta webhook verified in Developer Console | TODO (operator) |
| Live delivery proof in `automationLogs` | TODO (operator) |
| Marketing pixels env or `/marketing` UI | Optional |
| LKR online checkout (PayHere/WebXPay) | TODO — storefront COD today |

**Meta webhook:**

```text
Callback URL:  https://grabber-poz-solo.vercel.app/api/webhooks/whatsapp
Verify token:  WHATSAPP_VERIFY_TOKEN (same value on Vercel)
```

---

## Phase 4 — RLS + release gate (AUTOMATED GREEN)

| Step | Status |
|------|--------|
| `npm run db:apply-rls` on production Supabase | DONE |
| `npm run db:test-rls` on production pooler | DONE (2026-09-01) |
| `npm run release:gate -- --env-file .env.prod.txt --production --http` | PASS |
| `NEXT_PUBLIC_APP_URL` = production alias (not preview URL) | DONE |
| Rotate `TEMP$` owner PIN after first login | TODO |
| Manual operator smoke (RT-M01–M08) | TODO |
| [`RELEASE_GATE.md`](./RELEASE_GATE.md) sign-off | CONDITIONALLY READY |

**Run before each deploy:**

```powershell
npm run release:gate -- --env-file .env.prod.txt --production --http
```

**Re-sync env after `.env.prod.txt` changes:**

```powershell
npm run ops:sync-env -- --env-file .env.prod.txt
```

**Exit criteria:** Fresh DB → bootstrap → seed → certify → RLS applied → owner PIN rotated → pilot in [`certification/CLIENT_ACCEPTANCE_TEST.md`](./certification/CLIENT_ACCEPTANCE_TEST.md).

---

## Phase 5 — Repairs storefront + R6 agents (DONE — deploy to prod)

| Step | Status |
|------|--------|
| Public repairs landing `/shop/repairs` | DONE |
| 5-step wizard + track by ticket/phone | DONE |
| `StorefrontShell` (Products + Repairs + mobile nav) | DONE |
| Repair WhatsApp automations (`REPAIR_*` events) | DONE |
| 12 DB-grounded agents (all verticals) | DONE — [`AGENTS.md`](./AGENTS.md) |
| `/api/agents/brief` combined daily brief | DONE |
| HTTP cert `/shop/repairs*` on production | **Re-run after push** (`c74e829+`) |

**After git push:** Vercel redeploy → re-run `npm run release:gate -- --env-file .env.prod.txt --production --http`

---

## What remains (priority order)

| Priority | Item | Type | Status |
|----------|------|------|--------|
| 1 | Rotate owner PIN at `/adminpoz` | Operator | TODO |
| 2 | Meta WhatsApp webhook verify + test COD order | Operator | TODO |
| 3 | Manual commerce smoke RT-M01–M08 | Operator | TODO |
| 4 | Mobile Lighthouse on product + checkout | Operator | TODO |
| 5 | Jarvis live parity vs dashboard (staff session) | Operator | TODO |
| 6 | Agent → Approval Center EXECUTE bridge | Engineering | **DONE** (`approval-execute.ts`) |
| 7 | Staff `/repairs/[id]` workspace | Engineering | **DONE** |
| 8 | Stock reservation API (`POST/DELETE /api/inventory/reserve`) | Engineering | **DONE** |
| 9 | LKR online payments (PayHere/WebXPay) | Engineering | TODO |
| 10 | Repairs parts-from-stock | Engineering | **DONE** |
| 11 | SEC-05 API rate limits | Engineering | **DONE** |
| 12 | AUTO-03 `STOCK_LOW` owner alerts | Engineering | **DONE** |
| 13 | Live creative media (FAL/Replicate) | Engineering | TODO |

**Stock reservation (R2.1):**

```powershell
# Reserve 2 units for a POS hold or quote
curl -X POST https://grabber-poz-solo.vercel.app/api/inventory/reserve `
  -H "Content-Type: application/json" `
  -d '{"productId":"<uuid>","qty":2,"referenceType":"HOLD","referenceId":"HOLD-001"}'

# Release when hold cancelled
curl -X DELETE https://grabber-poz-solo.vercel.app/api/inventory/reserve `
  -H "Content-Type: application/json" `
  -d '{"productId":"<uuid>","qty":2,"referenceType":"HOLD","referenceId":"HOLD-001"}'
```
