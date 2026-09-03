# PRODUCT ARCHITECTURE AUDIT — Grabber Business OS (Solo)

**Phase:** 0 — Architecture freeze (investigation only)  
**Date:** 2026-09-03  
**Repo:** Grabber Poz Solo (`src/` App Router)  
**Scope:** No application code was changed for this report.  
**Graph:** `graphify-out/` (1,781 nodes · 4,477 edges · 114 communities · AST-only)

---

## Executive verdict

This is already a **Next.js 15 App Router + React 19 single-business Business OS**. It is **not** a CRA/Vite SPA and does **not** need a React → Next migration.

Commercial architecture (confirmed in docs + code):

> one codebase → one business per installation → one database per installation → many independently sold installations.

**Do not** convert to multi-tenant SaaS. **Do not** mass-convert staff pages to RSC. **Do not** rebuild.

The product is **architecturally sound and commercially valuable**. The gap is **productization**: security hardening, commerce invariants, installation identity, repeatable onboarding, then UI consistency.

**Milestone status:** DONE (documentation). Application: unchanged.

---

## 1. What was inspected

| Area | Evidence |
|------|----------|
| Package / stack | `package.json` — `next@^15.1.7`, `react@^19`, `drizzle-orm`, `zod`, `@sentry/nextjs` |
| Routing | `src/app/**/page.tsx` (~105 pages). No `src/pages/`, no `react-router` |
| Layout | `src/app/layout.tsx` (RSC) → `AppShell` (client) |
| APIs | ~100 `src/app/api/**/route.ts` handlers |
| DB | `src/db/schema.ts` + `src/db/index.ts` (Drizzle / Postgres). `drizzle/` migrations + `drizzle/rls_baseline.sql` |
| Auth | `src/lib/auth/session.ts`, `session-edge.ts`, `customer-session.ts`, `src/middleware.ts` |
| Release | `scripts/release-gate.mjs`, `scripts/validate-env.mjs`, `scripts/certify-client.mjs` |
| Tests | `tests/*.test.ts` (~40 files: commerce golden, RLS scripts, a11y, agents, WhatsApp) |
| Deploy | `vercel.json` (sin1, daily cron `/api/cron/process-jobs`) |
| Docs | `docs/COMMERCIAL_MODEL.md`, `CLIENT_ONBOARDING_PLAYBOOK.md`, `certification/*`, `RELEASE_GATE.md` |
| Design | `design-system/grabber-poz-solo/MASTER.md` (do not regenerate) |
| Graphify | God nodes: `getSession` (175), `Db` (100), `assertCanMutateCommerce` (95) |

---

## 2. C4 — containers

```text
                    CUSTOMER INSTALLATION (one business)
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
     STOREFRONT            BUSINESS OS           AI / COMMS
     Next RSC              Client pages          Jarvis / WhatsApp
     /  /shop /products/[slug]   /pos /inventory …    /api/agents /api/jarvis
          │                    │                    │
          └────────────────────┼────────────────────┘
                               ↓
                    Next.js API route handlers
                               ↓
                    Domain services (lib/commerce, lib/inventory, …)
                               ↓
                    Drizzle → PostgreSQL (dedicated DB)
```

**Workloads (keep this split):**

| Surface | Pattern | Why |
|---------|---------|-----|
| Storefront | Server Components + islands | SEO, SSR catalog |
| Staff OS | `'use client'` + `fetch('/api/…')` | Scanner, printer, cart, offline, forms |
| APIs | Node route handlers | Auth, mutations, webhooks |

---

## 3. God nodes (high-risk shared infrastructure)

From graphify + source:

| Node | Role | Change policy |
|------|------|----------------|
| `getSession()` / `decodeSession()` | HMAC session | Impact analysis + tests |
| `assertCanMutateCommerce()` / `assertRole()` | Mutation RBAC | Same |
| `Db` / `src/db/index.ts` | Data plane | Same |
| `durableCheckout` / `checkout-repo` | POS + storefront sale write | Commerce integrity |
| `stock-service` / inventory engine | Stock movements | Commerce integrity |
| `readConfigJson` / `business-settings` | Config blob | Config + flags |
| `Modal` | Staff dialogs | UI phase only |

**Import cycles:** none detected in graphify.

---

## 4. Dual entry points (commerce — Phase 2 later)

| Path | Entry | Service |
|------|--------|---------|
| POS / storefront checkout | `POST /api/pos/checkout` | `processPosCheckout()` → `durableCheckout()` |
| Commerce order | `CommerceService.createOrder()` | pricing → `reserveStock()` → `recordOrderInvoice()` |

Graph shows these as **separate communities**. Do **not** merge code in Phase 0/1. Phase 2 must prove **one business rule, two entry points** (pricing, tax, stock, payment, audit).

---

## 5. Auth architecture (as designed)

```text
Browser
  ↓
middleware.ts     Fast gate: public vs staff; cookie PRESENCE; path rate limits
  ↓
route handler     Cryptographic getSession() / getCustomerSession()
  ↓
assertRole / assertCanMutateCommerce
  ↓
service / db
```

This split is **reasonable**. Failures are in **coverage and environment bypasses** — see `SECURITY_AUDIT.md`.

Edge HMAC decoder already exists (`decodeSessionEdge` in `session-edge.ts`) but **middleware does not use it**.

Route classification is **triplicated**: `middleware.ts`, `app-shell.tsx` `isPublicSurface`, `layout.tsx` inline theme script. Drift risk. Fix in a later bounded PR (route-policy module) — not in this phase.

---

## 6. Feature inventory (do not remove)

POS, barcode, split payments, shifts, thermal receipts, storefront SSR, checkout, CMS/SEO, inventory/locations/transfers, purchasing/GRN, returns, customers, suppliers, Polim Potha, reports, approvals, automation, repairs + public storefront, WhatsApp, Jarvis/agents, creative, restaurant, HP, appointments, loyalty, wholesale/quotations, discounts, damages, trade-in, delivery/Koombiyo, PayHere.

Vertical packs already exist as **config**: `src/lib/config/vertical-presets.ts` + `/api/config/flags` + setup wizard. Phase 7 should **productize flags**, not spawn new apps.

---

## 7. What already exists vs later phases

| Master prompt phase | Already in repo? | Gap |
|---------------------|------------------|-----|
| 0 Architecture | This report + graphify | — |
| 1 Security | Partial (`getSession`, HMAC, WhatsApp signature, PayHere md5, RLS SQL) | Coverage holes, AUTH_OPTIONAL, cookie-presence gate |
| 2 Commerce invariants | Tests: `golden-business`, `commerce-s3`–`s7`, `stock-service` | No single `COMMERCE_INVARIANTS.md`; two checkout paths |
| 3 Installation identity | **Missing** (`GRB-SOLO-*` not in code) | Add later |
| 4 Onboarding | Playbook + `/setup` + seed + `onboarding-progress` test | Not a full 18-step engine |
| 5 Import | `/products/import` 3-stage CSV | Not a general XLSX mapping center |
| 6 UI forms | `Modal` + `Field` (products only); 4 hand-rolled overlays | After security |
| 7 Vertical packs | Presets + flags | Packaging/sales config |
| 8 Jarvis | Brief + agents + approval bridge | Daily ops copilot polish |
| 9 WhatsApp | Inbound handler + webhook | Keep event-driven |
| 10 Payments | `lkr-provider` adapters | Canonical lifecycle tests |
| 11 Certification | `client:certify` SQL + HTTP optional; 4-level docs | Expand to auth HTTP tests |
| 12 Release gate | `npm run release:gate` R1–R7 | Add AUTH_OPTIONAL fail |
| 13 Observability | Sentry wired | Structured ops events |
| 14 Operating model | Docs: one business / one DB | Hold the line |

---

## 8. UI (documented only — no Phase 6 work)

- Shared `Modal` used across POS, products, inventory, purchasing, customers, suppliers, HP, appointments, loyalty, returns, warranties, Polim, shifts.
- **Not** on Modal: quotations, wholesale, discounts, damages (`fixed inset-0`).
- `Field` / `staffInputClass` used on products catalog form only.

---

## 9. Tests and gates (current)

- Unit: Vitest under `tests/`.
- RLS: `npm run db:test-rls`.
- Env: `npm run env:validate` (does **not** fail on `AUTH_OPTIONAL=true`).
- Release: `node scripts/release-gate.mjs all --env-file … --production`.
- HTTP certify: optional `--http`.

---

## 10. Risks that remain (architecture)

1. Security coverage vs god-node importance (see security audit).
2. Two checkout pipelines without a written invariant contract.
3. No installation ID for support/license/cert.
4. Route-policy duplication.
5. In-memory rate limiter (per instance; weak on serverless).
6. Graphify health: 701 dangling edges — graph is directional, not a proof of absence.

---

## Next recommended milestone

**Only one:** implement a **bounded Phase 1 security PR** after human approval of `SECURITY_AUDIT.md` (P0 items). Do not start UI, RSC, import-center, or installation-ID work until that PR is certified.
