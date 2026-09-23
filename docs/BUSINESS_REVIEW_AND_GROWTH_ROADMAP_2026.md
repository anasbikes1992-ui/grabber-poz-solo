# Grabber Business OS — Full Codebase & Business Review, New Module Ideas, and Consolidated Roadmap

**Date:** 2026-09-17
**Scope:** Independent review of code, docs, stack, and UI/UX, plus new business/product ideas and a single prioritized roadmap.
**Relationship to existing docs:** This file does not replace [`goaldoc.md`](../goaldoc.md), [`goalplan.md`](../goalplan.md), [`docs/ROADMAP.md`](./ROADMAP.md), [`docs/GRABBER_GAP_REGISTER.md`](./GRABBER_GAP_REGISTER.md), or [`docs/CLAIMS_AND_SCOPE.md`](./CLAIMS_AND_SCOPE.md). Those remain the execution-level source of truth. This document adds an outside-in business lens, net-new module proposals, and a merged roadmap that reconciles all of them into one sequence.

> **Commercial update — 2026-09-23:** Current sales model is one **Grabber Business OS Pro** plan with vertical packs and quoted implementation extras. This document uses “growth” only as a business outcome, not as a package tier.

---

## 1. Executive Verdict

Grabber is an unusually mature, single-tenant retail/service operating system for the codebase's size: ~488 files in `src/`, 71+ relational tables, ~140 API routes, 85 test files across unit/integration/security/red-team suites, and five master documentation pillars. The architecture decision to reject multi-tenancy (one business = one DB = one app instance) is sound for the Sri Lankan SMB beachhead: it removes an entire class of cross-tenant data leak risk and keeps query plans simple.

The engineering discipline is genuinely strong in specific areas: canonical checkout/pricing/inventory services, double-entry accounting invariants, HMAC-authenticated webhooks, approval-gated AI (Jarvis) actions, and an honest claims/scope document that prevents sales overpromising. That last point is rare and valuable — most codebases at this stage have marketing drift ahead of code; this one has documentation actively fighting drift.

The gaps are not "missing features" so much as **missing depth behind existing surfaces** (purchase-to-pay, service/appointment resourcing, delivery provider abstraction) and **missing growth-multiplier products** that sit outside the core POS: a mobile companion app, an installable offline PWA, deterministic forecasting/reordering, a supplier/franchise layer, and local payment rails beyond card gateways. Section 4 proposes these as new sellable modules, and Section 6 gives one merged roadmap.

---

## 2. Technical Stack Review

| Layer | Current state | Assessment |
|---|---|---|
| Framework | Next.js 15 (App Router) / React 19 / TypeScript 5.7 | Current and well-chosen. React 19 + Next 15 gives you Server Actions and streaming if not already leveraged everywhere — worth auditing for routes still doing client-side fetch-then-render for data that could be a Server Component. |
| Database | PostgreSQL + Drizzle ORM 0.45, numbered migrations, `db:bootstrap` | Right choice for a relational commerce ledger. Numbered migrations + bootstrap script is good practice; `db:push` correctly excluded from the production path. |
| State | Zustand | Lightweight and appropriate for POS/cart local state. |
| Styling | Tailwind 3.4, Radix UI primitives, CVA, Framer Motion | Solid, modern baseline. Radix gives you accessible primitives "for free" if wired correctly — confirm `A11Y_AUDIT.md` items are closed for the primitives actually in use (dialogs, dropdowns, popovers, tooltips). |
| Validation | Zod | Good; confirm it is used at every API boundary, not just forms. |
| Observability | Sentry (client/server/edge configs present) | Present but effectiveness depends on DSN wiring per client deployment — verify per-tenant Sentry projects, not one shared project across client installs (would violate the data-isolation promise). |
| Background/creative | Python FastAPI + PyTorch/Diffusers (`creative-engine/`) | Reasonable separation of the GPU-heavy media path from the Node app. This is a second deployable with its own ops burden (GPU worker, model weights, queue) — make sure its health/circuit-breaker story is as mature as the DB-backed services (goalplan.md already flags this as Phase 6 work). |
| Testing | Vitest, 85 files, red-team folder, release-gate scripts | Strong unit/integration/security-simulation coverage. **Gap:** no browser-level E2E framework (no Playwright/Cypress in `devDependencies`). Physical POS and storefront flows are currently "manual smoke" per `ROADMAP.md` — that is a real risk for regressions in checkout, cart drawer, and KDS UI that unit tests cannot catch. |
| CI/CD | `.githooks` wired via `prepare` script; no GitHub Actions/CI config found in the workspace listing | Local hooks are good, but there is no visible automated pipeline gate (typecheck/test/build/release-gate) run on every push/PR before a human relies on it. |
| PWA / offline app shell | None found (no `manifest.json`, no service worker, no `next-pwa`) | The product already claims "offline-aware POS" via IndexedDB (`offline-engine.ts`), but without a manifest + service worker the POS cannot be installed as a home-screen app or survive a full network+browser-cache clear on a counter tablet. This is a cheap, high-leverage gap to close (Section 4.7). |
| Mobile | None (no React Native / Expo / Capacitor) | All operational surfaces are responsive web. For warehouse receiving, stocktake, and delivery drivers, a scanner-first native (or Capacitor-wrapped) app materially improves accuracy and speed versus a mobile browser. |
| i18n | `src/lib/i18n/translations.ts` (single file) | Sri Lanka's primary market speaks Sinhala and Tamil at the counter level; a single translations file suggests coverage is partial. Worth auditing coverage % and whether POS/staff console (not just storefront) is translated. |
| Design system | One "E-commerce Luxury" token set (`design-system/grabber-poz-solo/MASTER.md`) + 4 CSS theme presets in `themes/` | Tokens are well specified (WCAG-adjusted accent noted) but scoped to a single premium-retail mood. A restaurant, salon, or hardware-store client will not read as "premium retail dark+gold" — see Section 5. |

**Net assessment:** the core is production-grade for a single vertical retail counter. The two biggest technical risks to close before scaling client count are (1) no automated browser E2E gate, and (2) no CI pipeline enforcing typecheck/test/build/release-gate on every change — both are process gaps, not architecture gaps, and both are fast to add.

---

## 3. UI/UX Review

Reviewed against the design-quality bar in the workspace's own web design rules (hierarchy, intentional rhythm, designed states, anti-template policy) and the existing `A11Y_AUDIT.md` / `CODEBASE_MAP_AND_IMPROVEMENTS.md` findings.

### Strengths
- Portal separation (`/` company site, `/shop` storefront, `/adminpoz` staff) is a clean information-architecture decision that avoids mixing operator and customer contexts in the same shell.
- POS keypad/PIN flow and cart drawer already went through dedicated polish passes (P2/P3 in `ROADMAP.md`).
- The design-token file shows real craft (WCAG contrast adjustment on the accent color, deliberate shadow/spacing scale) rather than framework defaults.
- Vertical-flag gating in the hub/nav (`AUD-01`) means the UI doesn't show irrelevant modules to a business that hasn't purchased them — good progressive disclosure.

### Gaps and risks
1. **Single visual identity for all verticals.** A salon, a restaurant, and a hardware store share the same "premium dark + gold" token set. Real-world merchants strongly associate visual identity with their own brand; a hardware store owner will find a luxury-retail theme mismatched to their positioning. See Section 5 for a proposed per-vertical theme pack.
2. **Accessibility remediation is tracked but not fully closed.** `CODEBASE_MAP_AND_IMPROVEMENTS.md` still lists checkout label (`htmlFor`) fixes and `PromotionPopup` focus-trap wiring as open/partial. Given checkout and storefront are the highest-traffic customer-facing surfaces, these should be the top UI priority, not a background item.
3. **No dark/light mode choice for the staff console.** Counter environments vary (bright storefront vs. dim stockroom); a console-only dark mode toggle is low effort and materially helps all-day POS use.
4. **No visible empty-state/first-run design pass.** An 11-step onboarding wizard exists (`M7`), but empty states for a brand-new business (zero products, zero orders, zero customers) across dashboard/reports/CRM screens are a common place where new products feel unfinished if not deliberately designed.
5. **No component/story catalog.** With Radix + CVA already in place, a lightweight Storybook (or even a `/design-system` internal route) would let you visually regression-test components across the theme packs proposed in Section 5, and would pair naturally with the `e2e-runner`/visual-regression testing gap in Section 2.
6. **Mobile counter ergonomics untested at the browser-E2E level.** Given POS is used on tablets/phones in the field, and there is no Playwright coverage, responsive regressions (320–768px) can ship unnoticed.

---

## 4. New Business Ideas and Modules (Real-World Problem → Solution)

These are additions to the sellable catalog, not replacements for the existing goalplan phases. Each is framed as a real merchant problem, proposed as a scoped module, and given a rough package fit.

### 4.1 Grabber Scanner — companion mobile app for receiving, stocktake, and delivery
**Problem:** Warehouse receiving and stock counts done on a laptop or mobile browser are slow and error-prone; staff must type SKUs or fight a browser camera API.
**Solution:** A small Capacitor- or Expo-wrapped app (reuses existing TypeScript business logic and API) with a native camera barcode scanner, offline queue (reuses the existing IndexedDB offline engine pattern), and three modes: **Receive** (GRN put-away), **Count** (cycle count), **Deliver** (driver POD photo + signature capture).
**Fit:** Quoted implementation extra for clients that need receiving, cycle-count, or delivery proof workflows; also the natural home for the Section 4.4 delivery proof-of-delivery workflow already scoped in `goaldoc.md` §4.M.

### 4.2 Grabber Forecast — deterministic demand & reorder engine
**Problem:** Owners currently rely on gut feel for "what to reorder and how much," especially for grocery/FEFO and fashion seasonal stock.
**Solution:** A **deterministic**, explainable forecasting service (moving average + seasonality index per vertical pack, not a black-box model) that reads existing `stockMovements` and `salesMetrics` history to produce a suggested purchase-request draft — feeding directly into the purchase-to-pay chain already planned in `goalplan.md` Phase 3 (A05/A07). Suggestions are always a **draft PR**, never an auto-issued PO, preserving the approval-gated-AI principle already established for Jarvis.
**Fit:** Included as a Pro intelligence workflow once purchase-to-pay history exists; strong differentiator vs. Odoo-class competitors who mostly leave reordering manual at the SMB segment.

### 4.3 Grabber Local Pay — LankaPay/CEFTS/QR interbank rail
**Problem:** Current payment adapters (PayHere, WebXPay, Stripe, Koko, Mintpay, Payzy) are card/wallet-first. Many Sri Lankan merchants and customers prefer direct bank QR transfer (LankaPay JustPay / CEFTS) to avoid card MDR fees.
**Solution:** A new payment adapter following the existing adapter contract, targeting LankaPay JustPay QR, with the same idempotency/webhook/reconciliation guarantees already required of every provider in `goaldoc.md` §5.
**Fit:** Add-on; likely the single highest-requested feature from cost-sensitive merchants, since it reduces transaction fees versus card rails.

### 4.4 Grabber Group — multi-entity roll-up reporting (without breaking single-tenancy)
**Problem:** Some merchants operate several **legally separate** businesses (e.g., a family running a grocery, a hardware store, and a restaurant), each correctly isolated in its own Grabber installation per the architecture invariant. Today there is no way for the owner to see a combined picture.
**Solution:** A **read-only aggregation service** that pulls signed, summarized KPI exports (already-existing report/KPI APIs) from each installation via an authenticated pull or scheduled signed push, and renders a single "Group Dashboard." Critically, this does **not** introduce `tenant_id` or shared database access — each business's operational data stays in its own DB; only aggregated numbers cross the boundary, preserving the core architectural guarantee.
**Fit:** Quoted large-rollout implementation scope for multi-location owners — meaningful new revenue line for the same underlying Pro product, sold to operators who currently build this in a spreadsheet.

### 4.5 Grabber Trust — supplier & vendor scorecards
**Problem:** Purchase-to-pay (goalplan Phase 3) will produce rich GRN/invoice/variance data, but there's no way to see "which suppliers are reliable" over time.
**Solution:** A supplier scorecard view built on top of the same purchase-to-pay tables: on-time delivery %, short/damaged receipt rate, price variance trend, and average payment terms honored. This turns operational exhaust data already being captured into a decision-support module with near-zero new schema.
**Fit:** Included in Pro where the purchasing workflow is enabled; strengthens the purchasing story sold in Section 4.2.

### 4.6 Grabber Assist — voice/quick-command layer on Jarvis
**Problem:** Busy counters can't always type; a cashier's hands are full.
**Solution:** A thin voice-to-text front end (Web Speech API where available, graceful fallback to quick-command text chips) that feeds into the **existing** typed Jarvis tool contracts and preflight/approval engine described in `implementation_plan.md` Phase 4 — no new AI-safety surface is introduced, this is purely an input modality on top of already-approval-gated tools.
**Fit:** Included in Pro when voice/browser provider readiness is validated; strong demo differentiator with low incremental risk since it reuses the control plane already designed.

### 4.7 Grabber Offline App — installable PWA for the counter
**Problem:** The product already claims offline-aware POS (IndexedDB queue), but without a web app manifest and service worker it cannot be "installed" on a counter tablet, cannot control its own cache, and will not survive certain browser/OS cache-clearing behavior as gracefully as a true PWA.
**Solution:** Add `manifest.json`, an app icon set, and a scoped service worker (cache the POS shell + static assets; **do not** cache authenticated API responses beyond the existing IndexedDB engine) so `/pos` (and `/shop` for storefront) can be added to the home screen and launched full-screen. This is a small, contained engineering task relative to its reliability payoff.
**Fit:** Should be included in **every** package, not sold as an add-on — it directly de-risks the "works under pressure" marketing pillar already in `goaldoc.md` §8.

### 4.8 Grabber Compliance Pack — e-invoicing & regulatory readiness
**Problem:** Sri Lanka (and regional markets Grabber may expand into) increasingly moves toward mandated e-invoicing/VAT digital reporting. Being ready before it's mandatory is a sales advantage; being caught unready after a mandate is a liability.
**Solution:** An export/report module producing the structured invoice data format regulators are likely to require (aligned to existing tax registry + journal entries), sold as a low-effort compliance add-on now and a mandatory upgrade path later. Track the specific IRD/Customs requirement and scope narrowly — do not overclaim compliance the way `CLAIMS_AND_SCOPE.md` already warns against for other domains.
**Fit:** Quoted compliance-readiness scope; frame explicitly as "readiness," not "certified compliance," consistent with the existing claims discipline.

### 4.9 Grabber Insure — extended warranty & protection plan upsell
**Problem:** Electronics/repair verticals (already strong per the parity matrix) leave margin on the table by not systematically offering protection plans at checkout.
**Solution:** A checkout-time upsell line item tied to the existing warranty-claim relational model (`warranty_claims`, closed in GAP-011) — sell an extended-warranty SKU that, on claim, follows the exact same claim/RMA lifecycle already built. Almost pure product/pricing configuration, minimal new schema.
**Fit:** Configuration-level add-on for Electronics/Repair vertical packs — fast to ship, direct margin uplift.

### 4.10 Grabber Storefront Kiosk — "scan and go" in-store self-checkout for retail/grocery
**Problem:** QR ordering already exists for restaurant dine-in; general retail/grocery doesn't have an equivalent self-service accelerator for busy counters.
**Solution:** Extend the existing guest-order/QR infrastructure (already hardened per `CODEBASE_MAP_AND_IMPROVEMENTS.md` — UUID tokens, catalog-priced POST, rate limiting) into a retail "scan your own items, pay at a kiosk or via QR" flow that still settles through the canonical checkout service, preserving all commerce invariants.
**Fit:** Optional vertical-pack workflow for grocery/general retail once checkout, payment, and stock controls are certified.

---

## 5. UI/UX Enhancement Program

1. **Vertical theme packs.** Ship 4–6 additional token sets (already have 4 CSS presets in `themes/`) explicitly mapped to vertical packs (Restaurant warm/appetite palette, Salon soft/premium, Hardware utilitarian/high-contrast, Grocery bright/fresh) and let onboarding step 1 (Business Identity) select one, with the option to fine-tune accent color only — keeps brand consistency without letting every client bikeshed a whole design system.
2. **Close remaining a11y items first.** Treat the open checkout-label and `PromotionPopup` focus-trap items in `CODEBASE_MAP_AND_IMPROVEMENTS.md` as P0, not backlog — they sit on the highest-traffic, revenue-critical surfaces.
3. **Add a staff-console dark mode** (token-level, not a redesign) for stockroom/evening use.
4. **Design deliberate empty states** for dashboard, reports, CRM, and loyalty screens shown to a brand-new installation, so day-one demos and pilots feel finished rather than broken.
5. **Stand up a lightweight internal component gallery** (a `/internal/design-system` route behind staff auth, or Storybook) so new theme packs and components can be visually diffed before shipping — this also gives the proposed Playwright visual-regression suite (Section 6) fixed targets to snapshot.
6. **Adopt the workspace's own web design rules for any new marketing/storefront surface** (`ecc/web/design-quality.md` already loaded in this environment): avoid default card grids and generic hero patterns for the company landing page and any new vertical landing variants — these are explicitly called out as anti-patterns to avoid.

---

## 6. Consolidated Roadmap

This merges the existing `goalplan.md` GOAP phases (S0–S5, A01–A16), the `docs/ROADMAP.md` release train (R1–R7), and the new items from Sections 4–5 into one prioritized execution order. It does not change what `goalplan.md`/`ROADMAP.md` already committed to — it inserts the new items at the point they fit best and calls out what can run in parallel.

### Track A — Foundation integrity (continue as planned, unchanged)
Run `goalplan.md` Phase 0–1 (A01 claims freeze, A02/A03 integrity + audit) exactly as scoped. Nothing in this review changes that priority; it remains the correct P0.

### Track B — Commercial core (continue as planned, unchanged)
Run `goalplan.md` Phase 2–3 (A06 catalog/services, A05/A07 purchase-to-pay + inventory ops) as scoped. **Insert 4.2 (Grabber Forecast)** immediately after A05/A07 land, since forecasting needs the purchase-request entity to exist as its output target — near-zero extra schema cost if sequenced right after.

### Track C — New reliability/engineering items (run in parallel with Track A/B, low coupling)
| Item | Why now | Effort |
|---|---|---|
| Add GitHub Actions (or equivalent) CI running `npm run check` + `release:gate` on every PR | Closes the "no automated pipeline gate" finding in Section 2 | Low |
| Add Playwright for storefront checkout, POS sale, and cart-drawer smoke + visual regression | Closes the browser-E2E gap; directly supports the a11y and theme-pack work below | Medium |
| **4.7 Grabber Offline App** (manifest + service worker for `/pos` and `/shop`) | **DONE — M8 (2026-09-17).** See [`MILESTONE_M8_A11Y_PWA_HARDENING.md`](./MILESTONE_M8_A11Y_PWA_HARDENING.md). Manifest currently scoped to a single global `start_url: "/pos"`; per-route manifest split remains open. | Low |
| Close remaining a11y items (checkout labels, `PromotionPopup` focus trap) | **DONE — M8.** `role="alert"` added, contrast bumped to AA on checkout/CartDrawer/POS. S3 (`aria-pressed`), S5 (radiogroup arrow keys), and minor items remain open. | Low |

### Track D — Customer/workforce operations (continue as planned, unchanged)
Run `goalplan.md` Phase 4 (A08/A09/A10: customers, credit, loyalty, services, repairs, warranties) as scoped. **Insert 4.9 (Grabber Insure)** as a thin configuration layer once the warranty claim model (already closed, GAP-011) is confirmed stable — this is nearly free to add here.

### Track E — Fulfillment & vertical depth (continue as planned, unchanged)
Run `goalplan.md` Phase 5 (A04/A11/A12: payments, delivery, restaurant, grocery, wholesale) as scoped. **Insert 4.3 (Grabber Local Pay / LankaPay rail)** alongside A04's payment work — same adapter contract, additive. **Insert 4.1 (Grabber Scanner mobile app)** alongside A11's delivery/POD work, since POD capture is the app's third mode and A11 already requires POD infrastructure server-side.

### Track F — Automation, AI, and new intelligence surface (continue as planned + additions)
Run `goalplan.md` Phase 6 (A13: durable agent actions, dead letters, health probes) as scoped. **Insert 4.6 (Grabber Assist voice layer)** only after the Phase 6 typed-tool/preflight hardening is done, so voice input rides on an already-safe control plane rather than racing ahead of it.

### Track G — Vertical UI identity (new, can start any time after Track C's a11y items close)
Execute Section 5's theme-pack program (items 1, 3, 4, 5) alongside Track D/E vertical work, so each vertical pack ships with both the right operational depth and the right visual identity at the same time instead of shipping generic UI first and re-skinning later.

### Track H — Onboarding, pilots, and large-scope rollouts (continue as planned + additions)
Run `goalplan.md` Phase 7 (A14/A15/A16: onboarding console, pilots, marketing scale) as scoped. **Insert 4.4 (Grabber Group roll-up)** and **4.5 (Grabber Trust supplier scorecards)** here as quoted large-rollout scopes once the underlying purchase-to-pay and reporting data exists — both are read-only aggregation on top of already-planned data, so they should be nearly incremental cost to ship at this point. **Insert 4.8 (Grabber Compliance Pack)** and **4.10 (Grabber Storefront Kiosk)** as optional pilot scopes once a vertical's core depth (Track E) is certified for that segment.

### Sequencing at a glance

```text
Track A (integrity)         ─────▶ gates everything
Track B (commercial core)   ───────────▶ + Forecast (4.2) inserted after purchase-to-pay
Track C (CI/E2E/PWA/a11y)   ══════════════════════════════▶ runs in parallel throughout
Track D (customer/service)  ───────────────────▶ + Insure (4.9)
Track E (fulfillment)       ────────────────────────▶ + Local Pay (4.3) + Scanner app (4.1)
Track F (automation/AI)     ─────────────────────────────▶ + Assist voice (4.6)
Track G (vertical theming)  ────────────────────────▶ alongside D/E
Track H (onboarding/scale)  ──────────────────────────────────▶ + Group (4.4) + Trust (4.5) + Compliance (4.8) + Kiosk (4.10)
```

### Definition of done for this review
- Track A–B, D–F, H acceptance criteria remain exactly as defined in `goalplan.md` Section 9 and `docs/ROADMAP.md` release gates — this document adds insertion points, not new exit criteria for existing work.
- Track C and G items are considered done when: CI blocks merges on failing typecheck/test/build/release-gate; Playwright smoke + visual regression run in CI; `/pos` and `/shop` are installable PWAs; the two open a11y items are closed and verified by the a11y test suite; at least the four already-drafted theme presets are wired to vertical packs in onboarding step 1.
- Each Section 4 module is considered scoped-and-ready when it has a one-page spec (problem, schema delta if any, package tier, and explicit exclusions) added to `docs/CLAIMS_AND_SCOPE.md` and `docs/COMMERCIAL_MODEL.md` **before** any client-facing claim is made about it — consistent with the existing claims discipline.

---

## 7. Guardrails Carried Forward (do not relitigate)

- No multi-tenancy, no `tenant_id` proliferation — Section 4.4's Group product is deliberately read-only aggregation, not shared-schema multi-tenancy.
- No raw SQL access for any AI agent or voice layer — Section 4.6 rides entirely on the existing typed tool/preflight/approval engine.
- No unsupported production claims for pharmacy/rental/auto-parts, and no compliance overclaim for Section 4.8 — frame as "readiness," matching `CLAIMS_AND_SCOPE.md` Tier C discipline.
- Every new payment or delivery adapter (4.3, 4.1) follows the existing adapter contract: timeout, retry, idempotency, circuit breaker, and reconciliation, per `goaldoc.md` §5.
