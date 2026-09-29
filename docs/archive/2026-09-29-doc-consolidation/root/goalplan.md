# Grabber Business OS - Full Fix Goal Plan

**Date:** 2026-09-15
**Plan type:** Goal-oriented execution plan (GOAP)
**Scope:** Product, engineering, operations, security, marketing, deployment, and commercial readiness
**Strategy:** Extend the current commerce core. Do not rewrite POS, introduce multi-tenancy, or create unsupported vertical aliases.

## 1. Goal State

Grabber is ready for repeatable controlled production pilots and can truthfully sell the contracted package for each client.

### Goal-state acceptance criteria

- A fresh installation reaches go-live without direct database edits.
- Product, service, appointment, restaurant, repair, wholesale, and retail flows use canonical pricing, order, payment, inventory/consumption, tax, and audit services.
- Purchase-to-pay is complete: request, PO, GRN, inspection, put-away, supplier invoice, three-way match, payment, and reconciliation.
- Delivery is idempotent and supports provider events, proof of delivery, failed delivery, and return to origin.
- Accounting posts balanced journals and prevents mutation of posted entries.
- Every operational mutation has authenticated actor, location scope, idempotency, audit, and post-condition verification.
- Loyalty, warranty, credit, returns, and service completion reverse or reconcile when the originating order changes.
- Vertical claims are honest: operational verticals are certified; design-only verticals are excluded from sold scope.
- Marketing claims match code, tests, deployment prerequisites, and contract scope.
- A paid pilot can reach acceptance in <= 7 days with <= 0 critical incidents in the first 30 days.

## 2. Current State

### Assets already available

- Next.js 15 / React 19 / TypeScript application.
- Drizzle/PostgreSQL schema with approximately 71 tables.
- Approximately 138 API routes and 83 test files.
- Authoritative checkout, promotions, returns, inventory movement, FEFO, offline POS, restaurant KDS, repairs, loyalty, warranty claim base, delivery state protection, Jarvis approvals, and installation diagnostics.
- Numbered migrations and release gates.
- Existing claims, commercial model, roadmap, certification, gap register, onboarding, and test documentation.
- Dedicated single-business deployment model.

### Current constraints

- Some operational concepts are represented by JSON or free-text status rather than relational records/enums.
- Purchasing lacks full purchase-to-pay entities.
- Services lack resource, staff, capacity, deposit, and completion depth.
- External providers may be configured, simulated, stubbed, or manually reconciled.
- Creative media requires provider/worker infrastructure.
- No new work may include secrets from `env.dev.local`.

## 3. GOAP State Model

### State S0 - Audited foundation

**Preconditions:** current repository, existing migrations, existing claims, existing tests.

**Effects:** known modules and gaps are documented; no architecture rewrite is required.

**Cost:** low.

### State S1 - Integrity and security gate

**Preconditions:** S0; production environment validation available.

**Effects:** database constraints, authorization, audit, idempotency, and posted-record protections are verified.

**Cost:** high; highest risk reduction.

### State S2 - Commercial core complete

**Preconditions:** S1.

**Effects:** catalog, products, services, pricing, purchase-to-pay, payments, returns, and inventory reconcile end to end.

**Cost:** high; unlocks reliable retail and service sales.

### State S3 - Customer and workforce operations complete

**Preconditions:** S2.

**Effects:** customers, credit, loyalty, appointments, service staff, repairs, warranties, collections, and communications operate with durable histories.

**Cost:** high.

### State S4 - Fulfillment and vertical operations complete

**Preconditions:** S2; S3 for customer-facing service flows.

**Effects:** delivery, POD, RTO, restaurant operations, grocery, wholesale, and selected vertical depth are operational.

**Cost:** high; provider dependent.

### State S5 - Repeatable deployment and growth

**Preconditions:** S1 through S4 for the contracted package.

**Effects:** onboarding, monitoring, marketing, pilots, support, pricing, case studies, and maintenance economics are repeatable.

**Cost:** medium/high.

## 4. Action Inventory

| ID | Action | Preconditions | Effects | Cost | Risk |
|---|---|---|---|---:|---|
| A01 | Freeze claims and Pro scope matrix | S0 | Sales only promises certified/configured capabilities | Low | Low |
| A02 | Add schema integrity constraints | S0 | Invalid quantities, duplicates, overlaps, and unsafe journal lines rejected | Medium | Medium |
| A03 | Add durable audit/event histories | A02 | State transitions and sensitive actions are traceable | High | Medium |
| A04 | Complete payment/refund/reconciliation model | A02, A03 | Cash, gateway, refund, settlement, and chargeback truth separated | High | High |
| A05 | Complete purchase-to-pay | A02, A03, A04 | PO -> GRN -> invoice -> payment -> AP reconciliation | High | High |
| A06 | Complete product/service catalog model | A02 | Physical products and services sell with correct units, price, tax, cost, and capacity | High | Medium |
| A07 | Complete inventory warehouse operations | A02, A03, A05 | Bins, put-away, pick, pack, cycle count, valuation, and stock reconciliation | High | High |
| A08 | Complete customer/credit/loyalty/collections | A03, A04 | Statements, point reversals, collections, and disputes reconcile | High | Medium |
| A09 | Complete appointment/service operations | A03, A06, A08 | No double bookings; deposit -> service -> charge -> commission | High | High |
| A10 | Complete repair/warranty after-sales | A03, A04, A08 | Claim, RMA, repair/replacement, signoff, and SLA history | Medium/High | Medium |
| A11 | Complete delivery/logistics | A03, A04 | Provider adapters, events, POD, failed delivery, RTO | High | High |
| A12 | Complete vertical depth | A05, A06, A07, A08, A09 | Grocery, restaurant, wholesale, salon, and selected vertical workflows | High | High |
| A13 | Harden jobs/automation/Jarvis | A03, A08, A11 | Durable agent actions, retries, dead letters, health, cost, approval | High | High |
| A14 | Finish onboarding/release evidence | A01, A02, A03 | Repeatable client installation and go-live certification | Medium | Medium |
| A15 | Pilot and measure unit economics | A14 | Proof of adoption, support cost, retention, and case studies | Medium | Medium |
| A16 | Scale marketing and partner sales | A15 | Predictable pipeline without overclaiming | Medium | Medium |

## 5. Execution Sequence

### Phase 0 - Scope and claims freeze

**Actions:** A01

**Deliverables:**

- Approved commercial model: one Grabber Business OS Pro plan, vertical packs, and billable extras.
- Module readiness labels: Certified, Conditional, Design-only, Excluded.
- Claims review against code, tests, environment, and UAT evidence.
- No unsupported promises for pharmacy, rental, auto-parts, unlimited AI, gateways, or courier providers.

**Exit gate:** `CLAIMS_AND_SCOPE.md`, commercial model, marketing plan, and this plan agree.

### Phase 1 - P0 integrity and security

**Actions:** A02, A03

**Work items:**

1. Add positive quantity constraints for orders, PO lines, transfers, returns, stock adjustments, and service quantities.
2. Add unique active delivery/order policy.
3. Add unique loyalty member/customer policy.
4. Add barcode uniqueness strategy and duplicate resolution workflow.
5. Add appointment overlap protection by specialist/resource/time.
6. Prevent a journal line from having both debit and credit.
7. Add fiscal period lock and reversal-only correction for posted journal entries.
8. Add optimistic locking/version fields to high-contention records.
9. Replace polymorphic location IDs with a location registry or verified service boundary.
10. Require actor, role, location, idempotency key, and audit event for every mutation.
11. Run live production HTTP auth, RLS, integration secret, backup restore, and red-team checks.

**Exit gate:** all P0 tests pass; release gate fails closed on missing secrets or invalid production settings.

### Phase 2 - Product, service, pricing, and tax foundation

**Actions:** A06

**Work items:**

1. Add units of measure and conversion rules.
2. Add brands, product barcodes, supplier product mapping, cost history, and price history.
3. Add price lists for retail, wholesale, customer segment, branch, and channel.
4. Add bundles/kits and component stock consumption.
5. Add service definitions with duration, staff skill, resource, tax, commission, and consumables.
6. Add service packages and add-ons.
7. Add price approval and margin-floor rules.
8. Add tax effective-date overlap validation.
9. Store rule provenance on order lines and quotes.

**Exit gate:** a product, variant, bundle, service, or package can be priced, taxed, sold, reversed, and reported without client-side trusted values.

### Phase 3 - Purchase-to-pay and inventory operations

**Actions:** A05, A07

**Work items:**

1. Add purchase requests and approval.
2. Add goods receipt headers and lines.
3. Add inspection, short/over/damaged receipt, lot, serial, and put-away records.
4. Add supplier invoices and three-way matching.
5. Add supplier payments, debit notes, and purchase returns.
6. Add warehouse bins, pick tasks, pack tasks, and transfer manifests.
7. Add inventory valuation method and valuation snapshots.
8. Add cycle count schedules and adjustment approval thresholds.
9. Add stock reconciliation reports by product, variant, lot, serial, and location.

**Exit gate:** complete PO -> GRN -> put-away -> invoice -> payment and branch transfer flows pass without manual DB fixes.

### Phase 4 - Customer, credit, loyalty, services, and after-sales

**Actions:** A08, A09, A10

**Work items:**

1. Add customer addresses, consents, interactions, tags, merge, disputes, and collection cases.
2. Add configurable loyalty rules, points lots, expiry, tier history, and order-return reversals.
3. Add credit applications, limit history, promises to pay, late fees, and statements.
4. Add staff availability, leave, resource schedules, deposits, cancellations, waitlist, and no-show fees.
5. Add service consumption, completion record, commission, and customer signoff.
6. Add repair diagnosis, estimate approval, technician assignments, attachments, and parts reservations.
7. Add warranty claim events, RMA, replacement, claim SLA, and warranty costs.

**Exit gate:** retail, salon/service, repair, and credit customer journeys pass from booking/sale through completion, repayment, return, claim, or dispute.

### Phase 5 - Payments, delivery, restaurant, grocery, and wholesale

**Actions:** A04, A11, A12

**Work items:**

1. Separate payment attempts, authorizations, captures, refunds, settlements, fees, and chargebacks.
2. Add cash movements, deposits, petty cash, and bank reconciliation.
3. Create a courier adapter contract with provider accounts and webhook events.
4. Add shipments, packages, delivery zones, rates, driver assignment, POD, failed delivery, and RTO.
5. Add restaurant reservations, table combinations, guest checks, split bills, kitchen routes, recipe versions, allergens, and food cost snapshots.
6. Add weighted/decimal quantities, recalls, lot traceability, and expiry disposal for grocery.
7. Add customer price lists, MOQ, partial shipment, sales reps, B2B approvals, and account statements for wholesale.
8. Keep pharmacy, rental, and auto-parts out of production marketing until their dedicated gates pass.

**Exit gate:** each selected vertical has a signed workflow, data model, negative tests, physical/UAT checklist, and package boundary.

### Phase 6 - Automation, AI, creative, and observability

**Actions:** A13

**Work items:**

1. Move automation rules from JSON-only storage to versioned relational records.
2. Add execution history, dead letters, replay controls, worker heartbeats, and provider circuit breakers.
3. Add durable agent action, tool-call, approval, policy, data-snapshot, and cost tables.
4. Require typed schemas for all tools and post-condition verification for writes.
5. Add provider health probes that make authenticated test calls where safe.
6. Add creative provider cost tracking, asset license checks, approval/version history, and output acceptance.
7. Add adaptive anomaly baselines only after reliable metric snapshots exist.

**Exit gate:** jobs recover from worker failure, agent actions are replay-safe, creative usage is billable, and integrations report live/fallback/simulation accurately.

### Phase 7 - Onboarding, pilots, marketing, and scale

**Actions:** A14, A15, A16

**Work items:**

1. Finish the 11-step onboarding console.
2. Automate client provisioning, migration validation, staff setup, branch/register setup, integration checks, backup export, and certification evidence.
3. Create hardware reference kits and physical acceptance scripts.
4. Run three to five paid pilots across no more than two priority verticals.
5. Capture time to go-live, support hours, defects, retention signal, and margin.
6. Produce case studies based on measured outcomes.
7. Activate hardware reseller, accountant, and merchant-community referrals.
8. Scale only after pilot acceptance and support economics pass.

**Exit gate:** median go-live <= 7 days, no critical first-30-day incidents, support cost within package target, and signed acceptance for each pilot.

## 6. Marketing and Product Growth Plan

### Positioning

> One reliable stock and sales truth for Sri Lankan merchants, with dedicated deployment, local credit, storefront COD, practical support, and room to grow into services and branches.

### Launch sequence

1. Sell Grabber Business OS Pro to general retail, fashion, wholesale, party/event, and mobile/IT merchants.
2. Use unified stock, offline POS, local credit, returns, and dedicated deployment as the demonstration wedge.
3. Configure WhatsApp, payment gateways, repairs, branches, and creative workflows only when credentials and acceptance proof exist.
4. Introduce salon/service packages after scheduling and completion controls pass.
5. Introduce wholesale after B2B pricing, shipment allocation, and AP/AR statements pass.
6. Introduce pharmacy, rental, and auto-parts only after dedicated vertical certification.

### Content plan

- Weekly workflow demo: scan -> sale -> receipt -> stock change.
- Weekly trust demo: backup, restore, audit, and dedicated database.
- Monthly vertical case study.
- Local-language WhatsApp/Facebook short videos.
- Hardware partner co-demos.
- Accountant/bookkeeper content about credit, AP, stock, and reconciliation.
- Pilot outcome reports with measured numbers, not feature lists.

### Funnel metrics

- 20 qualified demos/month.
- 20%+ demo-to-paid conversion.
- 7-day median implementation.
- 90%+ physical POS first-pass acceptance.
- 95%+ maintenance retention.
- 50%+ onboarding gross margin.
- Declining support hours per merchant each cohort.

## 7. Release Gates

### Gate G0 - Claims

- Claims, commercial model, marketing copy, and Pro scope matrix agree.
- No conditional feature is advertised as included.

### Gate G1 - Security

- Production auth and negative HTTP tests pass.
- `AUTH_SECRET`, `MASTER_ENCRYPTION_KEY`, `CRON_SECRET`, and enabled integration secrets are valid and unique.
- No demo owner behavior in production.
- Rate limits and audit coverage verified.

### Gate G2 - Data integrity

- Stock movement and balance reconciliation pass.
- Journal entries balance and posted journals are immutable.
- Orders, payments, returns, loyalty, credit, and delivery idempotency tests pass.

### Gate G3 - Operational workflow

- PO -> GRN -> put-away -> invoice -> payment works.
- Product and service sale works.
- Appointment/resource conflicts reject correctly.
- Return/warranty/service completion works.
- Delivery/POD/RTO works if delivery is in package.

### Gate G4 - Deployment

- Fresh install from migration baseline succeeds.
- Onboarding completion is server-gated.
- Backup export and restore rehearsal succeeds.
- Sentry, health checks, job queue, and integration health are live.

### Gate G5 - Physical/UAT

- Scanner, printer, cash drawer, shift, sale, return, offline, and restore test pass.
- Client signs a seven-day acceptance sheet.

## 8. Risk Register

| Risk | Mitigation |
|---|---|
| Scope expands faster than delivery capacity | Configuration-first, package caps, change orders, vertical freeze |
| Payment/courier provider changes | Adapter contracts, webhook events, contract tests, provider health checks |
| Hardware fails in the field | Reference hardware kit, physical smoke gate, documented support boundary |
| Accounting drift | Immutable journals, reversal-only correction, period close, reconciliation reports |
| AI cost exceeds margin | Credit billing, usage ledger, no unlimited generation |
| Documentation overclaims | Claims SSOT and release-commit evidence |
| Founder becomes support bottleneck | Runbooks, SLA, partner network, onboarding automation, support queue |
| New vertical aliases create liability | Dedicated vertical acceptance gates and explicit exclusions |

## 9. Definition of Done for This Plan

- All G0-G5 gates pass for the contracted package.
- Every plan action has code, migration, test, UAT, or explicit deferral evidence.
- No untracked secrets are committed.
- `npm run typecheck`, `npm test`, `npm run build`, and applicable release gates pass.
- Changes are reviewed for security, data integrity, performance, and documentation drift.
- A clean commit is pushed to the intended repository and branch.

## 10. Execution Record

| Date | State | Evidence |
|---|---|---|
| 2026-09-15 | Plan authored | `goaldoc.md`, `goalplan.md` |
| 2026-09-15 | Prior P0/P1 fixes present | Full suite previously green: 83 files / 535 tests |
| Pending | G1-G5 execution | Update this table with release commits and pilot evidence |
