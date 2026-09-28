# Grabber Business OS Technical Overview

## Purpose

This document is the technical companion to `GRABBERPOZ.md`.

It explains what the current codebase supports, how the architecture fits the business model, what is correct, what still needs work, and how to refactor safely.

## Product Model

Grabber Business OS is a single-business retail operating system.

The architectural rule is:

- One client app.
- One client database.
- No shared tenant database.
- No hidden multi-tenant assumptions.

The POZ company app is separate from client apps. It handles the company website, leads, client provisioning, deployments, demos, and internal company administration.

ThePartyStore is a separate client database and must remain isolated.

## Current Architecture

Main stack:

- Next.js App Router
- TypeScript
- Drizzle ORM
- PostgreSQL / Supabase Postgres
- Coolify deployment
- Staff session auth with role-based route and API protection
- Tailwind-style dark staff UI

Important source areas:

| Area | Path |
| --- | --- |
| Database schema | `src/db/schema.ts` |
| Migrations | `drizzle/migrations` |
| DB bootstrap | `scripts/bootstrap-db.mjs` |
| Staff navigation | `src/components/ui/app-header.tsx` |
| Company admin | `src/app/company/*` |
| POS and checkout | `src/app/pos`, `src/app/api/pos/*`, `src/lib/db/repositories/checkout-repo.ts` |
| Purchasing and GRN | `src/app/purchasing`, `src/app/api/purchasing/*` |
| Demand planning | `src/app/ai/demand`, `src/app/api/inventory/demand` |
| Replenishment review | `src/app/purchasing/recommendations`, `src/app/api/purchasing/recommendations` |
| Storefront builder | `src/app/store/builder` |
| Business settings | `src/app/company/settings`, `src/app/settings` |

## Migration Review

The migrations are in the correct local order.

Relevant recent migrations:

| Migration | Purpose |
| --- | --- |
| `0022_company_leads.sql` | Company lead CRM |
| `0023_company_client_provisioning.sql` | Client provisioning register and onboarding tasks |
| `0024_company_deployments.sql` | Deployment register |
| `0025_inventory_demand_planning.sql` | Forecast runs, forecast items, SKU classifications, replenishment recommendations |
| `0026_replenishment_review_workflow.sql` | Supplier, warehouse, unit cost, notes, and draft PO linkage on recommendations |

`scripts/bootstrap-db.mjs` reads `drizzle/migrations`, filters only files ending in `.sql`, sorts them by filename, and applies them in order. Therefore:

- `0023` runs before `0024`.
- `0024` runs before `0025`.
- `0025` runs before `0026`.
- `0013_drop_legacy_triggers.sql.pending` is skipped by design because it does not end in `.sql`.

This is correct.

## Live Database Status

The screenshot shows:

`Client provisioning schema is pending. Run npm run db:bootstrap on the POZ database to apply migration 0023_company_client_provisioning.sql.`

That means the live POZ database is behind the code.

Code state: correct.

Production DB state: needs bootstrap.

Required live action after deploy:

```bash
npm run db:bootstrap
```

Run this against the POZ company app database, not ThePartyStore.

Expected result:

- `company_clients` exists.
- `company_onboarding_tasks` exists.
- `company_deployments` exists.
- `forecast_runs` exists.
- `forecast_items` exists.
- `sku_classifications` exists.
- `replenishment_recommendations` has the new review columns from `0026`.

## Business Logic Review

### Correct

- Single-business architecture is preserved.
- Company admin is separated from client runtime.
- Lead capture and CRM are separate from POS/checkout.
- Client provisioning register tracks isolated app/database setup.
- Deployment register tracks Coolify/domain/database readiness.
- Business profile and logo settings exist.
- Storefront themes and vertical presets support different client industries.
- Demand planning reads sales and stock data first.
- Replenishment recommendations do not mutate stock.
- Draft PO creation is explicit and staff-triggered.
- GRN remains the stock receiving path.
- ThePartyStore isolation is preserved.

### Needs Live Ops

- Production POZ DB must run `npm run db:bootstrap`.
- After bootstrap, smoke `/company/clients`, `/company/deployments`, `/ai/demand`, and `/purchasing/recommendations`.

### Still Missing

- Full purchase order approval state machine.
- Forecast accuracy reporting with WMAPE and bias.
- Supplier scorecards.
- Cost variance alerts.
- Full endpoint rate-limit matrix.
- Formal dependency and secret audit report.
- Upload safety hardening report.
- Documentation cleanup and archive pass.

## Main Runtime Flows

### Company Lead To Client

1. Prospect submits form on `grabberpoz.com`.
2. Lead is saved into `company_leads`.
3. Staff reviews at `/company/leads`.
4. Won lead becomes a client record at `/company/clients`.
5. Team creates a fresh Coolify app and fresh Postgres database.
6. Deployment is tracked at `/company/deployments`.
7. Client receives isolated app, DB, settings, vertical preset, storefront, and staff login.

### Demand Planning To Draft PO

1. Staff opens `/ai/demand`.
2. System reads products, order lines, sales, and stock balances.
3. System calculates:
   - Average daily demand
   - Available stock
   - Safety stock
   - Reorder point
   - Suggested order quantity
   - ABC/XYZ classification
4. Staff saves a forecast snapshot.
5. System writes forecast and replenishment recommendation records.
6. Staff opens `/purchasing/recommendations`.
7. Staff chooses supplier, warehouse, quantity, and unit cost.
8. Staff creates a draft purchase order.
9. Stock changes only later through GRN.

### POS / Storefront To Stock

1. POS or storefront order is created.
2. Checkout service handles idempotency, payments, stock effects, and audit.
3. Stock ledger remains the source of inventory movement truth.
4. Reports read from orders, payments, stock, shifts, and journals.

## Monetization Fit

The codebase supports a service-led SaaS model:

- Company site captures leads.
- Company CRM tracks prospects.
- Client provisioning register tracks handover.
- Separate databases allow premium “private instance” positioning.
- Vertical presets let the company sell one Pro platform to many business types.
- Storefront themes support demo selling.
- Demand planning and purchasing review add ERP value beyond basic POS.

Recommended commercial model:

- Setup fee for each client.
- Monthly subscription for app hosting, updates, support, backups, and monitoring.
- Optional implementation fees for data import, storefront design, payment gateways, WhatsApp, hardware, and custom reports.

## Current Technical Verdict

The codebase is coherent with the Grabber Business OS goal.

The current strongest areas are:

- POS/order/stock foundation
- Company admin
- Isolated client onboarding model
- Storefront theme/preset model
- Demand planning and replenishment foundation

The current weakest areas are:

- Live DB migration discipline
- Too many overlapping docs
- Purchase approval workflow not yet formalized
- Forecast quality not yet measurable
- Security hardening still needs a focused pass

## Caveman Review Findings

`production DB`: risk: live POZ DB is behind code; `/company/clients` shows migration 0023 missing. Run `npm run db:bootstrap` on POZ database.

`drizzle/migrations`: ok: `0023` to `0026` are ordered correctly. Keep `.pending` file out of normal bootstrap.

`docs/`: risk: too many docs overlap and can drift. Pick SSOT docs, archive old plans, keep this file plus `GRABBERPOZ.md`.

`purchasing`: risk: draft PO flow exists, but full PO approval state machine is still missing. Add approval transitions before GRN/payment.

`demand planning`: risk: recommendations exist, but no forecast accuracy measurement yet. Add WMAPE/bias before claiming advanced forecasting.

## Recommended Remaining Milestones

### Milestone 1: Live DB Alignment

Goal: production matches code.

Tasks:

- Redeploy latest `main`.
- Run `npm run db:bootstrap` on POZ company app database.
- Smoke:
  - `/company/clients`
  - `/company/deployments`
  - `/ai/demand`
  - `/purchasing/recommendations`
  - `/api/health`

Exit criteria:

- No “schema pending” banners.
- Client provisioning records can be created.
- Demand snapshot can be saved.
- Draft PO can be created from a recommendation.

### Milestone 2: Purchase Approval State Machine

Goal: draft PO cannot jump into receiving/payment without controlled approval.

Tasks:

- Define statuses: DRAFT, SUBMITTED, APPROVED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED.
- Add allowed transitions.
- Add role gates for approval.
- Add audit logs for each transition.
- Add tests around invalid transitions.

Exit criteria:

- GRN rejects unapproved PO unless role/policy allows.
- Audit trail shows approval actor and timestamp.

### Milestone 3: Forecast Accuracy

Goal: measure whether demand planning works.

Tasks:

- Store forecast period.
- Compare forecast quantity against actual sales.
- Add WMAPE and bias metrics.
- Add UI summary per SKU and forecast run.

Exit criteria:

- Owner can see whether recommendations are improving.

### Milestone 4: Supplier Intelligence

Goal: supplier selection becomes data-driven.

Tasks:

- Supplier lead-time defaults.
- Supplier scorecards.
- Cost variance alerts.
- Last PO cost versus GRN/AP invoice cost.

Exit criteria:

- Recommendation review can show preferred supplier and expected lead time.

### Milestone 5: Security Hardening Pass

Goal: reduce production risk before broader sales.

Tasks:

- Rate limits by endpoint class.
- Zod validation on public and mutating endpoints.
- Secret scan.
- Dependency audit.
- Upload safety audit.
- Error leakage review.

Exit criteria:

- Findings documented.
- High-risk gaps fixed or explicitly accepted.

### Milestone 6: Documentation Refactor

Goal: fewer docs, clearer source of truth.

Keep:

- `GRABBERPOZ.md`
- `GRABBERPOZTECHNICAL.md`
- `docs/GRABBERPOZ_BUSINESS_OS_MASTER.md`
- `docs/ERP_GAPS_AND_NEXT_WAVE.md`
- `docs/COMPANY_ADMIN_SUPERADMIN_PLAN.md`
- `docs/COOLIFY_4_CLIENT_DEPLOYMENT_PLAYBOOK.md`

Archive:

- Old brainstorming plans.
- Duplicate review files.
- Historical milestone notes that no longer drive work.

Exit criteria:

- New engineer can understand business, architecture, deployment, and roadmap in under 30 minutes.

## Final Recommendation

Do not start another feature before running live DB bootstrap and smoke testing the current production app.

After the live database is aligned, build the purchase approval state machine next.
