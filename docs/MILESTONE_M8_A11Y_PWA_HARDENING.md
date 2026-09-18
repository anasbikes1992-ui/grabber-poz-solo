# Milestone M8 — Accessibility Hardening & Installable PWA (Grabber Offline App)

**Date:** 2026-09-17
**Status:** CLOSED — code, tests, and docs verified in this pass
**Preceding milestone:** `M7` Client Deployment & Onboarding Console ([`implementation_plan.md`](../implementation_plan.md))
**Origin:** Track C ("new reliability/engineering items") of [`BUSINESS_REVIEW_AND_GROWTH_ROADMAP_2026.md`](./BUSINESS_REVIEW_AND_GROWTH_ROADMAP_2026.md) and the open Critical-2 (checkout labels) item in [`A11Y_AUDIT.md`](./A11Y_AUDIT.md).

---

## 1. Scope of this milestone

Two low-effort, high-leverage items were selected from the growth roadmap's Track C because they are self-contained, do not touch commerce/schema invariants, and directly close gaps between what the product **claims** and what the code **does**:

1. Close the remaining open accessibility findings on the storefront checkout and cart drawer (WCAG 2.2 AA).
2. Ship the "Grabber Offline App" — an installable PWA shell (manifest + service worker + icon) for `/pos` and `/shop`, so the counter app can be added to a home screen and reloads faster, without weakening the existing IndexedDB offline-transaction guarantees.

Everything else proposed in the growth roadmap (Forecast, Local Pay, Group roll-up, Scanner app, etc.) is **out of scope** for this milestone and remains tracked in that document's Tracks A–H.

---

## 2. What was verified before changing anything

- `docs/A11Y_AUDIT.md` already recorded **C1 (PromotionPopup focus trap)** and **C3 (dine-in control names)** as fixed in code, with **C2 (checkout labels)** still marked OPEN.
- Direct inspection of [`src/app/shop/checkout/page.tsx`](../src/app/shop/checkout/page.tsx) showed C2's core issues (missing `htmlFor`, missing `autoComplete`, missing `role="radiogroup"`) had **already been fixed** in a prior, undocumented pass — the audit note was stale, not the code. The two genuinely remaining gaps were:
  - The client-side error banner had no `role="alert"`, so validation/checkout failures were not announced to assistive tech.
  - Several secondary text elements still used `text-zinc-500` / `text-slate-500` on dark surfaces, measuring under the WCAG 1.4.3 AA 4.5:1 threshold per the audit's own contrast table.
- `docs/CODEBASE_MAP_AND_IMPROVEMENTS.md` still listed "checkout labels + PromotionPopup still open" — also stale relative to current code; corrected in Section 5 below.
- No `manifest.json`, service worker, or app icon existed anywhere in the repo (`public/` only contained `.gitkeep` and `uploads/`), confirming the PWA gap identified in the growth-roadmap technical review was real.

---

## 3. Changes shipped

### 3.1 Accessibility (WCAG 2.2 AA)

| File | Change |
|---|---|
| [`src/app/shop/checkout/page.tsx`](../src/app/shop/checkout/page.tsx) | Added `role="alert"` to the checkout error banner so validation/API failures are announced. Bumped five `text-zinc-500` instances (header lock note, item count, empty-bag message, line-item qty caption, terms footnote) to `text-zinc-400`, clearing 4.5:1 contrast on `bg-zinc-950`/`bg-zinc-900/50`. |
| [`src/components/storefront/CartDrawer.tsx`](../src/components/storefront/CartDrawer.tsx) | Bumped all six `text-slate-500` instances (empty-state icon/caption, remove-item icon, promo-tag icon, trust footnote) to `text-slate-400` for the same reason. |
| [`src/app/pos/page.tsx`](../src/app/pos/page.tsx) | Bumped both `placeholder:text-zinc-500` occurrences (product search, barcode input) to `text-zinc-400`. |

These close the last static-analysis-visible item from `A11Y_AUDIT.md`'s Critical/Serious findings (C2, part of S2). Remaining lower-severity items from the audit (S3 `aria-pressed` toggle states, S5 radiogroup arrow-key navigation, M-series minor items) are **not** in this milestone — they are cosmetic/keyboard-ergonomics polish, not blocking, and are left for a future pass so this milestone stays reviewable and low-risk.

### 3.2 Grabber Offline App (installable PWA shell)

| File | Purpose |
|---|---|
| [`src/app/icon.svg`](../src/app/icon.svg) | New brand icon (Next.js special file — auto-served at `/icon.svg` and picked up as the favicon) using the existing lime-on-zinc brand mark instead of the text-based `BrandLogo` component, since no PNG icon asset existed anywhere in the repo. |
| [`public/manifest.json`](../public/manifest.json) | Web app manifest: `start_url: "/pos"`, `display: "standalone"`, dark theme/background colors matching the existing brand tokens, `any` + `maskable` icon entries pointing at `/icon.svg`. |
| [`public/sw.js`](../public/sw.js) | Minimal service worker. **Deliberately conservative scope**: cache-first only for `/_next/static/*`, `/icon.svg`, and `/manifest.json`; every other request (all HTML navigations and every `/api/*` call) passes straight through with no caching. This makes the app installable and speeds up repeat static-asset loads without risking stale commerce data — the existing IndexedDB offline-transaction queue (`offline-engine.ts`) remains the sole source of truth for offline sale durability. |
| [`src/app/layout.tsx`](../src/app/layout.tsx) | Added `manifest: '/manifest.json'` and `appleWebApp` to the `Metadata` export, and a separate `viewport` export carrying `themeColor` (Next.js 15 moved `themeColor` out of `Metadata` into `Viewport` — done this way to avoid the build-time deprecation warning). |
| [`src/components/layout/app-shell.tsx`](../src/components/layout/app-shell.tsx) | Registers `/sw.js` on mount via `navigator.serviceWorker.register(...)`, wrapped in a feature check and swallowed rejection so unsupported browsers or registration failures never affect app boot. |

**Known, accepted limitation:** the manifest is global (one `start_url: "/pos"`), so a customer installing from `/shop` will still launch to `/pos` if they add the icon to their home screen. Per-route manifests (Next.js supports segment-level `metadata.manifest` overrides) were considered and deliberately deferred — `/pos` is the flagship "works under pressure" surface this milestone targets, and splitting manifests is tracked as a follow-up, not silently done partially.

### 3.3 Test coverage added

[`tests/a11y-smoke.test.ts`](../tests/a11y-smoke.test.ts) gained three new assertions (static source checks, consistent with the file's existing "no browser axe yet" approach):

- Checkout has labeled inputs, a `radiogroup`, an `alert` region, a `status` region, and no leftover `text-zinc-500`/`text-zinc-600`.
- `CartDrawer` contains no leftover `text-slate-500`.
- `public/manifest.json`, `public/sw.js`, and `src/app/icon.svg` exist; `layout.tsx` references the manifest; `app-shell.tsx` registers a service worker.

---

## 4. Verification

```powershell
npm run typecheck   # PASS — 0 errors
npx vitest run       # PASS — 85 test files, 552 tests, 0 failures
```

Both commands were re-run after every edit in this milestone, not just at the end. The a11y-smoke suite specifically was run twice: once to catch the three CartDrawer icon-color tokens the first pass missed, and once more after the follow-up fix, to keep the assertions honest rather than loosening them to fit the code.

---

## 5. Documentation corrections made in this pass

Docs are updated in the same change as the code they describe, per this repo's own claims discipline (`docs/CLAIMS_AND_SCOPE.md` §6, `goalplan.md` Definition of Done):

- [`docs/A11Y_AUDIT.md`](./A11Y_AUDIT.md) — C2 marked fixed with file/line evidence; release-gate checklist items for checkout ticked.
- [`docs/CODEBASE_MAP_AND_IMPROVEMENTS.md`](./CODEBASE_MAP_AND_IMPROVEMENTS.md) — "Public a11y" grade and P0 checkout-label row updated to reflect current code, not the 2026-09-11 snapshot.
- [`docs/ROADMAP.md`](./ROADMAP.md) — this milestone recorded as the item after `M7`.
- [`docs/BUSINESS_REVIEW_AND_GROWTH_ROADMAP_2026.md`](./BUSINESS_REVIEW_AND_GROWTH_ROADMAP_2026.md) — Track C's PWA and a11y rows marked done, pointing here.

---

## 6. What is still open (explicitly not claimed as done)

- S3 (`aria-pressed`/`aria-current` state on toggle buttons and nav), S5 (roving-tabindex arrow-key navigation for the two POS radiogroups), and the M1–M8/N1–N5 minor items in `A11Y_AUDIT.md` remain outstanding.
- No browser-level E2E/visual-regression coverage exists yet (Playwright or equivalent) — the a11y-smoke suite is still static-source pattern matching, not a rendered-DOM or axe-core check, exactly as its own file header says.
- The PWA shell has no offline-navigation fallback page; a hard offline reload of an uncached route still fails as before. Only static assets are cached — this was a deliberate scope boundary (Section 3.2), not an oversight.
- Per-route manifest scoping (`/shop` installing to its own `start_url`) is deferred, per Section 3.2.

These are carried forward into `docs/BUSINESS_REVIEW_AND_GROWTH_ROADMAP_2026.md` Track C/G rather than silently dropped.
