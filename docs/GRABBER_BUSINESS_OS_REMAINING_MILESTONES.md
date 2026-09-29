# Grabber Business OS Pro Remaining Milestones

Last updated: 2026-09-29

## Commercial Rule

Grabber sells one software product: **Grabber Business OS Pro**.

Every client gets the full supported platform. Differences between clients are implementation scope, vertical pack, providers, data migration size, hardware, branch count, and handover depth. These are not feature tiers.

## Current Foundation

- Single app and single isolated database per client.
- POS, storefront, orders, invoices, stock ledger, GRN, transfers, returns, shifts, customers, credit, loyalty, suppliers, demand planning, vertical packs, and storefront themes are present.
- Universal catalog import staging is present for WooCommerce-style, POS-style, Shopify-like, and standard CSV sources.
- Product import support tables exist for metadata, media links, and supplier preferences.
- Products from customer CSV files must still go through staging, review, approval, and apply. Do not import blindly.

## Milestone 1 - Order Automation Timeline

Goal: make the “8 jobs, zero clicks” workflow visible and auditable per order.

Scope:
- Durable order automation event table.
- Derived order checklist from current order, payment, fulfillment, delivery, and customer state.
- Staff API to read one order’s automation timeline.
- No checkout payload changes.
- No stock mutation changes.

Done when:
- Staff can inspect whether invoice, stock posting, ledger posting, receipt, pick/pack, delivery dispatch, bank match, and review request are done, ready, pending, blocked, or failed.
- Missing data is shown as a blocked/readiness state, not hidden.

## Milestone 2 - Fulfillment Pack

Status: in progress.

Implemented foundation:
- `fulfillment_work_items` table.
- `barcode_label_queue` table.
- Order fulfillment readiness API.
- Printable pick list, packing slip, and delivery note for each order.
- Orders and Delivery UI links to fulfillment documents.

Goal: turn storefront/POS orders into operational work.

Scope:
- Pick list view per order.
- Packing slip print surface.
- Delivery note print surface.
- Courier manifest queue.
- Barcode-label queue from orders, GRN, and catalog import review.

Done when:
- A staff member can open an order, pick products, print packing slip, prepare delivery note, dispatch courier, and see the order timeline update.

## Milestone 3 - Customer Communication Pack

Status: foundation implemented.

Implemented foundation:
- `customer_communication_events` audit table.
- `customer_metrics` lifetime value table.
- Idempotent jobs for order receipts, post-delivery review requests, daily owner summaries, and customer metric refresh.
- Staff API to queue receipt/review sends and refresh customer metrics.
- Ops Health counters for sent/failed/skipped communication events and WhatsApp provider readiness.

Goal: automate customer messages without overclaiming provider readiness.

Scope:
- Receipt send job.
- Review request scheduled after delivery.
- Daily owner summary digest.
- Customer lifetime value calculation.
- WhatsApp/email provider health clearly shown.

Done when:
- Communication jobs are idempotent, logged, retryable, and visible in Ops Health.

Remaining polish:
- Add a staff UI panel for recent communication events and customer CLV.
- Auto-queue receipt/review jobs from approved order lifecycle hooks after a final live smoke.
- Add email fallback when WhatsApp is not configured.

## Milestone 4 - Bank And Reconciliation Pack

Status: foundation implemented.

Implemented foundation:
- Bank account and reconciliation UI already existed.
- Added bank statement line staging.
- Added payment match proposals and approval records.
- Approved bank matches update the order automation timeline `bank_match` step.
- Existing reconciliation completion still requires the statement balance equation to hold.

Goal: match the video vision for cash position and bank matching, while staying honest about provider access.

Scope:
- Manual/imported bank feed matching first.
- Provider adapter interface for future LankaPay/CEFTS/open-banking connections.
- Live cash position dashboard from configured sources.
- Bank-match automation event linked to orders/payments.

Done when:
- Manual CSV/API bank feed entries can match payments without changing canonical checkout logic.

Remaining polish:
- Add CSV upload UI for bank feeds.
- Add bank feed provider adapters only after provider credentials/contracts are real.
- Add cash-position dashboard cards over the new bank feed/match data.

## Milestone 5 - ERP Completion

Status: foundation implemented.

Implemented foundation:
- Purchase approval event trail and staff API.
- Forecast accuracy snapshots with WMAPE and bias.
- Supplier scorecard snapshots.
- Cost variance alert snapshots.

Goal: finish purchasing and planning control loops.

Scope:
- Full purchase approval state machine before GRN/payment.
- Forecast accuracy reporting using WMAPE and bias.
- Supplier scorecards.
- Cost price variance alerts.
- Multi-currency display where needed.
- Payroll final export.

Done when:
- Purchasing and demand planning are audit-safe and owner-approved before money or stock moves.

Remaining polish:
- PO creation now defaults to `SUBMITTED`; keep seed/demo POs explicit when they must be receivable.
- Render scorecards, variance alerts, and forecast accuracy in the purchasing/demand UI.
- GRN is approval-gated; payment approval remains a separate owner workflow.

## Milestone 6 - Security And Ops Hardening

Status: foundation implemented.

Implemented foundation:
- Configurable rate-limit foundations already exist.
- Upload MIME, size, extension, and magic-byte validation already exist.
- Added `npm run security:audit` to check auth coverage, rate-limit config, upload validation, source-map exposure, hardcoded secret patterns, and raw 500 error leakage.
- Removed raw 500 error leakage from legacy API routes.
- Promoted `npm run security:audit` into `npm run check`.
- Cleared dependency audit with a safe Drizzle Kit patch and targeted transitive `esbuild` override.
- Extended `npm run ops:smoke` with optional read-only staff checks for Ops Health, provider health, bank reconciliation, ERP control, handover readiness, and client register using `CERTIFY_STAFF_COOKIE`.

Goal: make the platform safer to hand over repeatedly.

Scope:
- Endpoint-specific rate limits.
- Strict input schemas on remaining public/staff APIs.
- Secret scan and frontend exposure check.
- Dependency audit and safe upgrades.
- Generic user-facing errors with full server-side logs.
- Upload content/type/size validation.
- Live read-only smoke script.

Done when:
- Release gates document and enforce the production safety checks.

Remaining polish:
- Keep dependency audit and `ops:smoke` output in release notes and re-run before every client handover.

## Milestone 7 - Client Handover Polish

Status: foundation implemented.

Implemented foundation:
- Added a handover readiness service that checks client register status, onboarding checklist, linked deployment health, smoke-test task, SOP task, domain, and database readiness.
- Added `/api/company/admin/handover` for owner/admin handover readiness reporting.
- Added `/company/handover` owner UI with ready/review/blocked summary cards, blockers, deployment status, and SOP gate.
- Linked Handover Readiness under Company navigation, SuperAdmin command center, and roadmap.

Goal: make onboarding repeatable for ThePartyStore and every future client.

Scope:
- ThePartyStore handover smoke: catalog/images, staff login, POS sale, storefront COD, receipt, return, report, backup, restore rehearsal.
- Mobile/tablet admin smoke at 375/768/1024/1440.
- Brand/logo/settings completeness.
- Client provisioning register tied to handover checklist.

Done when:
- A client can be provisioned, tested, trained, and handed over from one SOP without tribal knowledge.

Remaining polish:
- Run ThePartyStore live handover smoke and record the checklist in `/company/clients`.
- Add exportable PDF/CSV handover report after the first live smoke.
- Add hardware acceptance fields for scanner, printer, cash drawer, and tablet/mobile sign-off.

## Guardrails

- No multi-tenant shared database.
- No direct blind import into live client catalog.
- No checkout, stock, POS, or payment rewrite inside these milestones.
- No new paid feature tiers.
- Provider integrations must be labelled configured, stub, or unavailable.
