# Grabber Business OS — Implementation Map

Factual map of **what exists**, **what to keep**, and **what is missing** vs the MyPoz Solo master vision.

Last updated: 2026-09-01  
**Fresh deploy:** [`FRESH_START.md`](./FRESH_START.md)

---

## Feature classification

| Class | Meaning | Action |
|-------|---------|--------|
| **KEEP** | Production-quality; do not rewrite | Preserve |
| **FIX** | Correct concept; incomplete or unsafe | Patch in place |
| **COMPLETE** | Scaffold exists; needs wiring | Finish |
| **REPLACE** | Duplicate or wrong SSOT | Consolidate |
| **REMOVE** | Dead / SaaS baggage | Delete safely |
| **FUTURE** | Not started; defer to roadmap | Plan only |

---

## Core platform

| Feature | Class | Location | Notes |
|---------|-------|----------|-------|
| Single-business model | KEEP | `business_profile`, `business_config` | No tenant/org_id in app |
| Drizzle schema (49 tables) | KEEP | `src/db/schema.ts` | SSOT |
| DB connection (pooler + SSL) | KEEP | `src/db/index.ts` | |
| Atomic checkout | KEEP | `src/lib/db/repositories/checkout-repo.ts` | Idempotent sales |
| Commerce services | KEEP | `src/lib/commerce/*` | Pricing, tax, inventory, credit, GL |
| Order state machine | FIX | `src/lib/commerce/order-state-machine.ts` | Unify POS + storefront statuses |
| Migrations | FIX | `drizzle/migrations/0000–0002` | Use `npm run db:bootstrap` |
| Legacy column bridges | FIX | `0002` + triggers | Temporary; drop in R1-P2 |
| RLS baseline | COMPLETE | `drizzle/rls_baseline.sql` | Apply + test (S2) |
| Seed / demo data | KEEP | `src/app/api/seed/route.ts` | |
| Certification | KEEP | `scripts/certify-client.mjs` | L4 SQL gates |

---

## Auth & security

| Feature | Class | Location | Notes |
|---------|-------|----------|-------|
| Staff PIN session | KEEP | `src/lib/auth/session.ts`, middleware | |
| Shopper session | KEEP | `src/lib/auth/customer-session.ts` | |
| Role checks on APIs | KEEP | `assertCanMutateCommerce` | |
| Jarvis auth | FIX → DONE | `src/app/api/jarvis/chat/route.ts` | Real session (S1) |
| Granular permissions | FUTURE | — | doc §116 |
| Approval center | COMPLETE | `/approvals`, `/api/approvals` | S9 |

---

## Commerce modules

| Module | Class | Pages | APIs |
|--------|-------|-------|------|
| POS | KEEP | `/pos` | `/api/pos/*` |
| Products | COMPLETE | `/products`, import | `/api/products` |
| Inventory | KEEP | `/inventory`, damages | `/api/inventory` |
| Purchasing / GRN | KEEP | `/purchasing` | `/api/purchasing/*` |
| Suppliers | KEEP | `/suppliers` | `/api/suppliers` |
| Customers | KEEP | `/customers` | `/api/customers` |
| Polim Potha | KEEP | `/polim-potha` | `/api/polim-potha/*` |
| Returns | KEEP | `/returns` | `/api/returns` |
| Shifts | KEEP | `/shifts` | `/api/shifts/*` |
| Orders admin | COMPLETE | `/orders` | `/api/orders` |
| Reports | KEEP | `/reports` | `/api/reports/*` |
| Discounts | COMPLETE | `/discounts` | Needs rules engine (R2) |
| Quotations | COMPLETE | `/quotations` | `/api/quotations` |
| Merchant hub | KEEP | `/app` | `/api/dashboard/stats` |

---

## Storefront

| Feature | Class | Location | Gap |
|---------|-------|----------|-----|
| Public catalog | KEEP | `src/app/page.tsx` | SSR CMS blocks |
| Product detail pages | KEEP | `/products/[slug]` | SSR + JSON-LD |
| Store builder | KEEP | `/store/builder` | Persisted via `/api/settings/storefront` |
| Checkout | KEEP | `/shop/checkout` | COD via `durableCheckout` |
| SEO / sitemap | KEEP | `sitemap.ts`, `robots.ts` | S5 |
| Themes | KEEP | `storefront-config.ts` | CMS theme tokens |

---

## Integrations

| Feature | Class | Location | Gap |
|---------|-------|----------|-----|
| WhatsApp send | COMPLETE | `/api/integrations/whatsapp/send` | Preview without env |
| WhatsApp automation | COMPLETE | `src/lib/automation/engine.ts` | config_json rules + logs |
| PayHere webhook | KEEP | `/api/webhooks/payhere` | |
| Koombiyo | COMPLETE | `/api/integrations/koombiyo/create` | Stub pattern |
| Storage upload | KEEP | `/api/storage/upload` | Needs Supabase keys |

---

## Intelligence

| Feature | Class | Location | Gap |
|---------|-------|----------|-----|
| Jarvis tool registry | FIX | `src/lib/ai/jarvis-tools.ts` | |
| DB-grounded tools | IN_PROGRESS | `src/lib/ai/jarvis-db-tools.ts` | 11 READ tools (S1) |
| Jarvis context | KEEP | `src/lib/ai/jarvis-context.ts` | Session-based |
| Jarvis drawer UI | KEEP | `src/components/ai/jarvis-drawer.tsx` | Wire to tools |
| Agents | PARTIAL | `src/lib/agents/*`, `/ai/agents` | R6 — 12 agents live |
| Creative generate | COMPLETE | `/api/creative/generate`, `/creative` | No approval workflow |
| AI demand | COMPLETE | `/ai/demand` | Placeholder |

---

## Vertical modules (flag-gated)

| Vertical | Class | Flag | Pages |
|----------|-------|------|-------|
| Restaurant / KOT | KEEP | `restaurant` | `/restaurant` |
| Repairs (staff) | KEEP | `repairs`, `/api/repairs` | `/repairs` |
| Repairs (public) | KEEP | `repairs/public`, `lib/repairs/*` | `/shop/repairs`, `/shop/repairs/request`, `/shop/repairs/track` |
| Hire purchase | KEEP | `hirePurchase` | `/hire-purchase` |
| Appointments | KEEP | `appointments` | `/appointments` |
| Loyalty | COMPLETE | `loyalty` | `/loyalty` |
| Wholesale page | REPLACE | `/wholesale` redirects → `/quotations` |

---

## Scripts & ops

| Script | Purpose |
|--------|---------|
| `npm run db:bootstrap` | Apply migrations 0000–0002 + column align |
| `npm run db:align-columns` | Idempotent missing columns |
| `npm run client:certify` | L4 SQL certification |
| `npm run ops:sync-env` | Push `.env.local` → Vercel |
| `npm run env:validate` | Pre-deploy env check |

---

## Duplicate / dead code (cleaned 2026-09-01)

| File | Status | Notes |
|------|--------|-------|
| `sidebar.tsx`, `header.tsx` | REMOVED | Use `app-header.tsx` |
| `lib/creative/creative-engine.ts` | REMOVED | Unused |
| `lib/backup/backup-service.ts` | REMOVED | Export inlined in API |
| Mock `/collections`, `/setup`, `/accounts` | REDIRECT | See `FRESH_START.md` |
| `db:push` as SSOT | REPLACE | Use `npm run db:bootstrap` |

---

## Service flow (authoritative)

```text
POS / Store / Jarvis / WhatsApp
           ↓
   commerce-service + checkout-repo
           ↓
      pricing / tax / inventory engines
           ↓
         Drizzle → Postgres
```

Never add parallel checkout or pricing logic in UI or AI layers.

---

## Related

- [`ROADMAP.md`](./ROADMAP.md) — sprints & releases
- [`correction.md`](./correction.md) — tracked fix IDs
- [`BUSINESS_OS_MYPOZ_EXTRACTION_AUDIT.md`](./BUSINESS_OS_MYPOZ_EXTRACTION_AUDIT.md) — historical audit
