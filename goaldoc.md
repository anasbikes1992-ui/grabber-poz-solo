# Grabber Business OS - Full Scope Goal Document

**Document status:** Working product and business scope
**Date:** 2026-09-15
**Product:** Grabber Business OS Solo
**Commercial model:** Perpetual Single-Business Usage License + Infrastructure & Maintenance + optional credits
**Operating principle:** One business, one isolated application instance, one dedicated PostgreSQL database

## 1. Executive Goal

Make Grabber a dependable business operating system for merchants that sell physical products, services, prepared food, repairs, appointments, credit, and deliveries through one operational truth.

The finished system must allow a business to:

1. Configure its identity, branches, staff, registers, warehouses, taxes, and operating rules.
2. Create and sell products, variants, bundles, services, packages, repairs, food, and quoted work.
3. Receive stock, reserve stock, transfer stock, count stock, sell stock, return stock, and write off stock without ledger drift.
4. Accept cash, card, gateway, COD, credit, split, deposit, and installment payments with reconciliation.
5. Manage customers, consent, loyalty, credit, collections, appointments, service completion, and after-sales claims.
6. Run retail, wholesale, grocery, electronics, repair, restaurant, salon, and future vertical workflows from a common core.
7. Connect WhatsApp, couriers, payment gateways, storage, monitoring, and creative workers with honest health states.
8. Give Jarvis and agents grounded read access and approval-controlled write access only.
9. Produce reliable operational, tax, financial, inventory, customer, and marketing reports.
10. Be deployable repeatedly without founder-only manual intervention.

## 2. Product Boundary

### Included core promise

- Dedicated single-business deployment.
- Staff-authenticated POS and staff operating console.
- Public storefront with server-authoritative pricing and COD checkout.
- Products, variants, categories, inventory, purchasing basics, returns, customer credit, reports, and accounting foundation.
- Offline-aware POS queue and idempotent checkout.
- Configurable vertical modules.
- Approval-based automation and business intelligence.

### Optional contracted capabilities

- WhatsApp Cloud API.
- PayHere, WebXPay, Stripe, Koko, Mintpay, Payzy, or other payment providers.
- Courier providers and managed delivery.
- Multiple branches and warehouses.
- Repairs, restaurant/KDS, salon appointments, loyalty, hire purchase, wholesale, and creative workflows.
- AI image/video credits and GPU workers.
- Custom integrations, reports, migrations, and self-hosting.

### Explicit exclusions unless separately delivered

- Multi-tenant SaaS.
- Source-code ownership or resale rights.
- Unlimited AI generation.
- Guaranteed third-party provider uptime.
- Production pharmacy, rental, or auto-parts compliance without their dedicated workflows.
- Full payroll, statutory accounting, or legal compliance without a separately scoped implementation.

## 3. Current Baseline

The repository currently contains 99 relational tables in `src/db/schema.ts`; treat the schema as the source of truth over older counts. The strongest implemented areas are authoritative checkout, inventory movement, returns, promotions, offline POS, restaurant KDS, repairs, approval-based Jarvis, and deployment/security gates.

The main incompleteness pattern is not a missing page. It is a missing operational lifecycle, relational ledger, external-provider proof, or production control behind a feature that already has UI/configuration.

Current known boundaries:

- Purchasing lacks a complete purchase-to-pay chain with dedicated GRN, supplier invoice, supplier payment, and purchase-return entities.
- Services are primarily represented as service-type products; resource, staff, capacity, deposit, and completion models are incomplete.
- Delivery has a guarded core state machine but lacks provider abstraction, proof of delivery, failed-delivery, and return-to-origin workflows.
- Pharmacy, rental, and auto-parts are architectural aliases, not production verticals.
- Creative, social, courier, and some payment capabilities remain provider/configuration dependent.
- Accounting is a strong double-entry foundation but not a full finance/period-close/payroll platform.

## 4. Domain Scope and Target Completeness

### A. Identity, tenancy boundary, and administration

**Current:** business profile, business configuration, users, roles, branches, registers, warehouses, location assignments, installation identity, license diagnostics.

**Target:** staff credential history, failed-login controls, device/register enrollment, branch hours, holidays, approval delegation, staff status history, permission overrides, secure session revocation, and auditable settings changes.

**Done when:** a staff member can be created, assigned, rotated, suspended, revoked, scoped to locations, and audited without direct database work.

### B. Catalog and sellable items

**Current:** categories, products, variants, pricing fields, item types, tax profiles, imports, media, SEO fields.

**Target:** brands, units of measure, conversions, barcodes, supplier products, cost history, price lists, customer tiers, bundles, kits, substitutions, product lifecycle, product approvals, service definitions, service add-ons, packages, and commission rules.

**Done when:** a merchant can sell a product or service with the correct unit, price, tax, cost, margin, availability, staff/resource requirement, and history.

### C. Pricing, tax, discount, and promotion

**Current:** authoritative pricing, tax registry, promotion rules, discount authorization, promotion redemption.

**Target:** effective-dated price history, price approvals, branch/customer price lists, minimum margin protection, stacking/exclusion rules, promotion budgets, redemption caps, quote price snapshots, tax rate overlap validation, and explainable price provenance.

**Done when:** every order line can answer why this price, tax, discount, and approval were applied.

### D. POS and order lifecycle

**Current:** POS, storefront, COD, WhatsApp/API channels, split payments, idempotency, shift reconciliation, order state fields.

**Target:** order event history, line-level fulfillment, backorders, partial shipments, deposits, layby, order edits, cancellation reasons, payment allocation, customer notifications, offline conflict resolution, and void/override audit.

**Done when:** every order has a traceable lifecycle from draft to settlement, fulfillment, return, refund, or cancellation.

### E. Inventory and warehouse operations

**Current:** stock balances, immutable movements, reservations, release, transfers, FEFO lots, stock takes, damage write-offs, offline sync.

**Target:** bins, put-away, pick/pack, quarantine, cycle counts, decimal quantity/UOM, weighted inventory, stock adjustment approvals, stock aging, inventory valuation, serial event enforcement, reservation expiry, and reconciliation snapshots.

**Done when:** physical stock, available stock, reserved stock, damaged stock, serial stock, lot stock, and accounting valuation reconcile by location.

### F. Purchasing and supplier accounts payable

**Current:** suppliers, supplier accounts, supplier entries, purchase orders, purchase lines, receiving logic, transfer foundation.

**Target tables and lifecycle:**

```text
purchase_requests
purchase_request_lines
purchase_orders
purchase_order_lines
goods_receipts
goods_receipt_lines
supplier_invoices
supplier_invoice_lines
supplier_payments
purchase_returns
purchase_return_lines
supplier_price_history
supplier_documents
```

**Lifecycle:** request -> approval -> PO -> supplier confirmation -> GRN -> inspection -> put-away -> invoice -> three-way match -> payment -> reconciliation.

**Done when:** no supplier invoice can be paid without matching ordered, received, and invoiced quantities or an explicit approved variance.

### G. Customers, CRM, AR, loyalty, and collections

**Current:** customers, Polim Potha, repayments, aging, loyalty members and transactions, storefront accounts.

**Target:** customer addresses, consent, contacts, interaction timeline, duplicate merge, credit applications, credit-limit history, collection cases, promises to pay, customer disputes, configurable loyalty programs, point lots/expiry, tier history, referrals, and return-based point reversal.

**Done when:** a customer has one reliable profile, consent history, sales history, service history, credit statement, loyalty statement, and support timeline.

### H. Payments, refunds, cash, and reconciliation

**Current:** payment methods, gateway adapters, webhooks, idempotency, refunds, shift reconciliation.

**Target:** payment attempts, provider events, authorisation/capture/void/refund states, settlement fees, chargebacks, payment allocation, cash movements, safe/bank deposits, petty cash, bank reconciliation, and refund confirmation.

**Done when:** order amount, payment attempt, captured payment, provider settlement, refund, and bank/cash reconciliation are separate auditable records.

### I. Services, appointments, salon, and professional work

**Current:** service item types, appointments, repair appointments, salon commission export, public booking.

**Target tables:**

```text
service_categories
service_definitions
service_variants
service_addons
service_packages
service_package_lines
service_staff
staff_skills
staff_availability
staff_leave
service_resources
resource_bookings
appointment_events
appointment_deposits
appointment_cancellations
appointment_waitlist
service_consumption
service_completion_records
service_commissions
customer_consents
```

**Done when:** a service business can book a resource and staff member without double booking, collect a deposit, perform the service, consume materials, charge the customer, calculate commission, and request a review.

### J. Repairs and warranties

**Current:** repair intake, estimates, repair parts, device/serial registry, warranty registration, warranty claims base table, customer tracking.

**Target:** diagnosis history, estimate approval, parts reservation, parts return, technician assignments, condition photos, customer signoff, data-wipe consent, manufacturer RMA, replacement workflow, claim SLA, and warranty cost attribution.

**Done when:** a device can move from intake through diagnosis, approval, repair, warranty decision, payment, handover, and repeat claim with complete evidence.

### K. Restaurant and food operations

**Current:** tables, KOT/KDS, stations, modifiers, recipes, BOM depletion, kitchen waste, FEFO support.

**Target:** reservations, table merge/split, guest/seat checks, bill split, waiters, kitchen printer routes, recipe versions, yields, substitutions, menu availability, allergens, daily food-cost snapshots, and voided-KOT reason audit.

### L. Vertical engines

**Operational now:** general retail, grocery, fashion, electronics, restaurant, hardware, repair-oriented workflows.

**Conditional:** salon/services, wholesale, loyalty, hire purchase, delivery, creative, WhatsApp, payment gateways.

**Not production verticals yet:** pharmacy, rental, auto parts.

**Pharmacy target:** prescriptions, patients, prescribers, pharmacist approvals, batches, controlled-substance audit, dispensing.

**Rental target:** rental assets, availability calendar, deposits, check-out/in inspection, late fees, damage disputes, asset maintenance.

**Auto-parts target:** vehicle makes/models/generations/engines, compatibility, OEM cross-reference, fitment notes, customer vehicle assets.

### M. Delivery and logistics

**Current:** delivery records, Koombiyo/in-house dispatch, tracking, guarded status transitions.

**Target:** provider adapters, provider accounts, shipments, packages, delivery zones, rates, drivers, events, proof of delivery, failed delivery, return-to-origin, delivery SLA, parcel dimensions and weight.

### N. Communications and marketing

**Current:** WhatsApp threads/messages/templates, automation, marketing spend ledger, social settings, UTM fields, creative projects.

**Target:** consent, template approval/versioning, delivery/read events, campaign recipients, social publishing jobs, campaign budgets, spend synchronization, attribution, content calendar, creative version approval, license expiry, and campaign ROI.

### O. Accounting, reports, and analytics

**Current:** chart of accounts, journal entries/lines, tax reports, sales reports, KPI APIs, backups, audit logs.

**Target:** fiscal periods, period close/reopen, bank accounts, expenses, fixed assets, depreciation, payroll boundary, budgets, tax return packages, journal reversals, report schedules, snapshots, branch comparisons, service profitability, and cash-flow reporting.

### P. Jarvis, agents, jobs, and automation

**Current:** typed tools, approvals, DB-grounded reads, risk classification, job outbox, retries, anomaly rules.

**Target:** durable agent actions, tool schemas, prompt versions, cost events, data snapshots, policy versions, job heartbeats, dead-letter UI, provider circuit breakers, relational automation rules, and post-condition verification.

**Safety rule:** no AI action may mutate inventory, payments, credit, refunds, or journals without authenticated context, role scope, approval, idempotency, audit, and verification.

## 5. Cross-Cutting Robustness Requirements

### Data integrity

- Positive quantity constraints.
- Unique active delivery per order.
- Barcode uniqueness policy.
- Tax effective-date overlap prevention.
- Appointment overlap protection.
- Journal line debit/credit exclusivity.
- Immutable posted journals with reversal-only corrections.
- Optimistic locking for concurrent edits.
- Foreign-key-safe location references or explicit location registry.

### Security

- Production HMAC sessions only.
- Fail-closed integration secrets.
- Staff role sourced from server session, never request body.
- Location authorization on every operational query and mutation.
- Rate limits backed by a distributed or edge mechanism.
- Audit coverage for every state-changing route.
- Secret access and credential rotation audit.
- Secure backup encryption and restore rehearsal.

### Operational reliability

- Every external provider call has timeout, retry, idempotency, circuit breaker, and provider event reconciliation.
- Every background job has attempts, lease timeout, dead-letter status, replay action, and alerting.
- Every module has a health check that tests capability, not merely presence of credentials.
- Every production claim maps to an executable test, smoke test, or signed acceptance record.

## 6. Product Offer

### Grabber Business OS Pro

Every client receives the full Pro platform: POS, products, inventory, COD storefront, customers, Polim Potha, reports, Jarvis/agents, backups, updates, and managed deployment. Pricing varies by implementation size, migration scope, branch count, hardware, and support/SLA requirements — not by feature tier.

### Vertical packs

- Retail & Wholesale.
- Electronics & Repairs.
- Restaurant / Cafe.
- Salon / Services.
- Party / Events.
- Grocery / Pharmacy later, only after dedicated certification.

### Add-ons

- Payment gateway configuration.
- Courier/provider integrations.
- Creative C1/C2 credits.
- Custom reports and migrations.
- On-site hardware and training.
- Large branch rollout, self-hosting, and custom workflow development.

## 7. Target Customers and Positioning

### Primary beachhead

Sri Lankan owner-operated and family-managed merchants with one to three locations, 500 to 10,000 SKUs, local credit sales, barcode hardware, and a need to keep selling during network interruptions.

### Priority segments

1. General retail and minimarts.
2. Fashion and footwear.
3. Mobile/electronics and repair.
4. Hardware and contractor supply.
5. Small restaurants and cafes.
6. Salons and appointment businesses after service hardening.
7. Wholesale/distribution after B2B tables and fulfillment are complete.

### Positioning

> Grabber is the dedicated retail and service operating system for Sri Lankan merchants who want one reliable truth across counter sales, inventory, credit, purchasing, services, and their own storefront.

### Differentiators

- Dedicated deployment and database.
- Local Polim Potha credit workflow.
- Offline-capable POS.
- Shared stock between counter and storefront.
- Implementation, migration, hardware setup, and support.
- Approval-based intelligence rather than unsafe autonomous mutation.

## 8. Marketing Plan

### Message pillars

1. **One stock truth:** counter and storefront use the same inventory.
2. **Built for local operations:** credit, COD, returns, WhatsApp, and hardware.
3. **Dedicated and supported:** private database, backups, maintenance, and local help.
4. **Works under pressure:** offline-aware POS, idempotent checkout, audit trails.
5. **Grows with the business:** branches, services, repairs, restaurant, wholesale, and intelligence.

### Proof-based content

- Counter sale to printed receipt demonstration.
- Stock reduction visible in storefront.
- Offline sale and reconnect sync.
- Customer credit sale and repayment.
- Return with restock and refund.
- Purchase order to receipt to stock.
- Appointment to service charge.
- Repair intake to parts to handover.
- Restaurant KOT to recipe depletion.
- Dedicated database and backup explanation.

### Channels

- Hardware reseller referrals.
- Accountants and bookkeepers.
- Sri Lankan merchant WhatsApp/Facebook communities.
- Retail associations and chambers.
- Field demos to target merchants.
- Short local-language workflow videos.
- Case studies after paid pilots.

### Funnel

```text
Educational workflow content
  -> qualified merchant conversation
  -> live counter demo
  -> data/hardware assessment
  -> scoped proposal
  -> paid pilot
  -> seven-day acceptance
  -> recurring maintenance
  -> referral/case study
```

### Claims discipline

Marketing must use [docs/CLAIMS_AND_SCOPE.md](docs/CLAIMS_AND_SCOPE.md) as the source of truth. Never claim unlimited AI, online card payments without configured acceptance, physical hardware certification without testing, or pharmacy/rental/auto-parts production readiness without their dedicated modules.

## 9. Business Operating Metrics

### Product metrics

- Checkout success rate.
- Duplicate checkout prevention rate.
- Stock reconciliation variance.
- Order-to-delivery cycle time.
- Appointment no-show rate.
- Repair turnaround time.
- KOT preparation time.
- Loyalty earn/redeem reconciliation variance.
- Background job success and dead-letter rate.
- Provider webhook reconciliation lag.

### Commercial metrics

- Qualified demos per month.
- Demo-to-paid conversion.
- Median go-live time <= 7 days.
- Catalog import rework < 10%.
- Physical POS first-pass acceptance >= 90%.
- First-30-day critical incidents = 0.
- Maintenance retention >= 95%.
- Gross margin on implementation >= 50%.
- Support hours per merchant per month.
- Monthly recurring revenue and expansion revenue.

## 10. Definition of Done

The full-scope goal is complete only when:

- All P0 data/security gates pass.
- Purchase-to-pay is complete and reconciled.
- Product and service selling share authoritative order, tax, payment, inventory/consumption, and accounting flows.
- Branch, warehouse, register, staff, and approval scopes are enforced.
- Delivery, returns, warranty, and service lifecycles have durable histories.
- Every major provider has real health checks and webhook reconciliation.
- Pharmacy, rental, and auto-parts claims are either implemented or explicitly excluded from the sold package.
- New client onboarding completes without direct database edits.
- Pilot customers complete physical acceptance and seven-day operation.
- Product documentation, claims, pricing, and code agree.

## 11. Non-Goals

- Rebuilding the POS from scratch.
- Introducing multi-tenancy.
- Replacing specialist payroll or statutory accounting without a dedicated scope.
- Adding AI agents before their data and approval contracts are reliable.
- Adding a new vertical alias and calling it production-ready.
- Treating credentials-present as provider-live.

## 12. Source Documents

- [CLAIMS_AND_SCOPE.md](docs/CLAIMS_AND_SCOPE.md)
- [COMMERCIAL_MODEL.md](docs/COMMERCIAL_MODEL.md)
- [BUSINESS_OS_ARCHITECTURE.md](docs/BUSINESS_OS_ARCHITECTURE.md)
- [BUSINESS_OS_DATABASE_DESIGN.md](docs/BUSINESS_OS_DATABASE_DESIGN.md)
- [BUSINESS_OS_TEST_PLAN.md](docs/BUSINESS_OS_TEST_PLAN.md)
- [GRABBER_GAP_REGISTER.md](docs/GRABBER_GAP_REGISTER.md)
- [GRABBER_CERTIFICATION_FALSE_POSITIVES.md](docs/GRABBER_CERTIFICATION_FALSE_POSITIVES.md)
