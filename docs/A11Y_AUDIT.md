# Accessibility Audit — WCAG 2.2 Level AA

**Scope:** `src/app/shop/**` (menu, QR dine-in, appointments, checkout, login), `src/app/pos/**`,
`src/app/globals.css`, and interactive components in `src/components/storefront/**`, `src/components/ui/modal.tsx`, `src/hooks/use-drawer-a11y.ts`.
**Method:** static source review. Contrast ratios computed from the literal token/Tailwind values in code.

---

## Critical
> **Follow-up 2026-09-11:** C1 PromotionPopup + C3 dine-in + useDrawerA11y focus-steal fixed in code. C2 checkout labels still OPEN.
 — blocks task completion for assistive-tech users

**C1. Promotion popup is a dialog with no focus management, on every storefront page.**
`src/components/storefront/PromotionPopup.tsx:98-177` (mounted at `storefront-shell.tsx:104`)
It declares `role="dialog" aria-modal="true"` and handles Escape (lines 72-80), but never moves focus into the
panel, never traps Tab, never restores focus, and never locks background scroll. It auto-opens 1.5s after load, so a
keyboard user is left on a page whose visible modal sits behind the whole header in focus order. Two correct
implementations already exist in-repo: `Modal` and `useDrawerA11y`.
*SC 2.4.3 Focus Order, 4.1.2 Name/Role/Value.*

**C2. Every checkout form control lacks a programmatic label.**
`src/app/shop/checkout/page.tsx:407-456` (name, phone, address, notes), `515-524` (promo code)
Labels are siblings with no `htmlFor`; no input has an `id`, `aria-label`, or `aria-labelledby`. Screen readers
announce "edit text, blank" for the entire purchase flow. The `*` required markers (`:408, :421`) are visual only —
no `required`/`aria-required` — and there is no `autoComplete` on name/tel/street-address.
*SC 1.3.1, 3.3.2 Labels or Instructions, 1.3.5 Identify Input Purpose, 4.1.2.*

**C3. QR dine-in ordering controls have no accessible names.**
`src/app/shop/dine/[tableToken]/page.tsx:143-168, 193-199`
The `+`/`−` quantity buttons contain only a decorative Lucide icon and announce as "button"; the "Add" button never
identifies the dish; the table-notes input is placeholder-only. This is the guest's primary ordering path.
*SC 4.1.2, 2.4.6, 3.3.2.*

---

## Serious — significant barriers

**S1. Order success and error states are never announced.**
Checkout swaps the page to a confirmation view with no focus move and no live region (`checkout/page.tsx:312`);
same for the appointment confirmation code (`appointments/book/page.tsx:61-74`) and the dine-in KOT banner
(`dine/[tableToken]/page.tsx:107-117`). Checkout validation errors (`checkout/page.tsx:600-605`) are not
`role="alert"`, and the catalog load error is a plain `<p>` (`storefront-home.tsx:506-510`). POS does this correctly
(`pos/page.tsx:666-668`) — reuse that pattern. *SC 4.1.3 Status Messages, 3.3.1.*

**S2. Text contrast below 4.5:1.**

| Location | Colors | Ratio |
|---|---|---|
| `checkout/page.tsx:415,428,441,454,523` | `placeholder:text-zinc-600` on `bg-zinc-950` | ~2.8:1 |
| `checkout/page.tsx:482,505,507,556,616` | `text-zinc-500` on `bg-zinc-900/50` | ~3.7:1 |
| `pos/page.tsx:800` | `placeholder:text-zinc-500` on `bg-zinc-900/80` | ~3.7:1 |
| `CartDrawer.tsx:196,368` | `text-slate-500` on `bg-slate-900` | ~3.7:1 |

The checkout placeholders are worst: they carry the only phone-format and promo-code instructions
("07XXXXXXXX or +947XXXXXXXX", "e.g. WELCOME500"), at 10–11px, and they disappear on input.
*SC 1.4.3 Contrast (Minimum).*

**S3. Selected state conveyed by color alone, with no ARIA state.**
- Checkout payment method (`checkout/page.tsx:468-509`) — plain buttons, no `aria-checked`/`aria-pressed`. Worse, the
  PayHere option when `!payhereReady` is styled `cursor-not-allowed` but is **not** `disabled` or `aria-disabled`: it
  stays focusable and the click silently does nothing (`:488-490`).
- Category pills (`storefront-home.tsx:481-501`), login mode toggle (`shop/login/page.tsx:58-73`), POS mode + currency
  switchers (`pos/page.tsx:676-765`) — no `aria-pressed`.
- Storefront nav (`storefront-shell.tsx:16-23, 212-238`) — no `aria-current="page"`.
*SC 1.4.1 Use of Color, 4.1.2, 4.1.3.*

**S4. Catalog search is unlabeled.** `storefront-home.tsx:441-456` — placeholder-only input; the clear button's only
accessible name is the literal glyph `✕` (it uses `title`, not `aria-label`). Filtering also never reports a result
count. *SC 3.3.2, 4.1.2.*

**S5. `role="radio"` groups have no arrow-key navigation.** `pos/page.tsx:994-1019` (discount presets) and
`1238-1271` (payment tender). Roles and `aria-checked` are right, but each radio is its own tab stop and arrows do
nothing, so the announced role contradicts actual keyboard behavior. *SC 4.1.2, 2.1.1.*

---

## Moderate

- **M1. Light-theme focus ring is just under 3:1.** `globals.css:28` — `--focus-ring: 160 84% 35%` (≈`#0ea472`)
  measures ≈2.98:1 on `--background`. Dark theme (`:62`) and `--sf-ring` (≈16.8:1) are fine. *SC 1.4.11, 2.4.13.*
- **M2. Framer Motion bypasses reduced-motion in the cart drawer.** The `prefers-reduced-motion` blocks
  (`globals.css:100-109, 241-249`) only neutralize CSS; the spring slide-in and backdrop fade at
  `CartDrawer.tsx:139-158` are JS-driven. `storefront-home.tsx:75, 91-97` already uses `useReducedMotion` correctly.
- **M3. Sub-24px targets in POS.** Currency switcher (`pos/page.tsx:749-765`) is `px-1.5 py-0.5` on 10px text,
  ≈22×18 CSS px, with no spacing exception. *SC 2.5.8 Target Size (Minimum).*
- **M4. Decorative emoji announced by name.** `storefront-home.tsx:516` (`🔍`), `:560` (`🛍️`) lack `aria-hidden`.
- **M5. Broken images leave an empty box.** `storefront-home.tsx:554-556` sets `display:none` on error instead of
  swapping in the existing text fallback, so the card loses both image and alt text. *SC 1.1.1.*
- **M6. Heading levels skip.** POS goes sr-only `h1` (`:669`) → `h3` cards (`:857`); `CartDrawer` `h2` (`:168`) →
  `h4` items (`:216`). *SC 1.3.1.*
- **M7. Voice search toggle** (`pos/page.tsx:804-815`) is icon-only with a `title`-based name and no pressed state.
- **M8. Dine-in tray total is not a live region.** `dine/[tableToken]/page.tsx:184-192`.

## Minor

- **N1.** Announcement bar (`storefront-shell.tsx:105-109`) is a plain `<div>`; should be `role="status"` if runtime-updatable.
- **N2.** `aria-label` on a non-interactive `<span>` (`pos/page.tsx:966`) is unreliably exposed; the visible quantity already reads.
- **N3.** `/shop/checkout` and `/shop/login` build their own chrome with no skip link; login has no `<main>` at all.
- **N4.** Storefront tokens are declared twice (`globals.css:87-98` and `163-180`) — drift risk on `--sf-accent`/`--sf-ring`.
- **N5.** Public menu (`shop/menu/page.tsx:54-62`) renders item name and price as two unassociated `<p>` elements.

---

## Top remediations (ordered)

1. **Wrap `PromotionPopup` in the shared `Modal`** (or call `useDrawerA11y`) — fixes C1 and deletes a bespoke dialog.
2. **Label every checkout input**: `id` + `htmlFor`, `autoComplete="name" | "tel" | "street-address"`, `required`,
   and `aria-describedby` pointing at the error region. `checkout/page.tsx:405-457, 515-524`.
3. **Name the dine-in controls**: template-literal `aria-label` of "Add one \<item name\>" / "Remove one \<item name\>"
   on the steppers, "Add \<item name\> to order" on the Add button, and a real `<label htmlFor="dine-notes">`.
4. **Announce completion**: focus the confirmation heading (`tabIndex={-1}`) and wrap the summary in `role="status"`
   on checkout, appointments, and dine-in. Mirror `pos/page.tsx:666-668`.
5. **Fix S2 contrast**: checkout placeholders `zinc-600 → zinc-400`, secondary text `zinc-500 → zinc-400`, POS
   placeholder `zinc-500 → zinc-400`, CartDrawer `slate-500 → slate-400`. All then clear 4.5:1.
6. **Make the checkout payment selector a real radiogroup** (`fieldset` + `role="radiogroup"`/`radio` + `aria-checked`,
   copying `pos/page.tsx:1238-1271`) and mark unavailable PayHere `disabled` with a visible reason.
7. **Mechanical ARIA state pass**: `aria-pressed` on all toggle buttons, `aria-current="page"` on active nav links.
8. **Label catalog search** with an `sr-only` label, `aria-label="Clear search"` on the clear button, and a
   `role="status"` "N products" line after filtering.
9. **Roving `tabIndex` + arrow keys for the two POS radiogroups** — or downgrade them to `aria-pressed` toggles.
10. **Raise light `--focus-ring` to ≥3:1** (e.g. `160 84% 28%`) and gate `CartDrawer` motion behind `useReducedMotion`.

---

## What's already good

- **`src/components/ui/modal.tsx`** is a genuinely correct dialog: `aria-modal`, `useId` labelling/description, Tab
  trap with Shift+Tab wrap, initial focus that deliberately skips the close button, focus restore, Escape with a
  `busy` guard, body scroll lock, 44×44 close button.
- **`useDrawerA11y`** gives slide-overs the same guarantees, and `CartDrawer` uses it.
- **POS is the strongest surface**: sr-only `h1`, a persistent `aria-live="polite"` region fed on every meaningful
  state change (add, qty, hold, offline sync, completion, errors), sr-only labels on search/barcode/promo,
  `aria-label` on every quantity control, `aria-invalid` + `aria-describedby` + `role="alert"` on the manager PIN,
  `fieldset`/`legend` on tender, and `min-h-[44px]` targets throughout.
- **Skip link + `<main>` landmark** in `StorefrontShell` (`:98-103, 205`), with a visible reveal style.
- **Storefront tokens hit AA**: `--sf-accent #a16207` ≈4.9:1 on white; `--sf-ring #1c1917` ≈16.8:1.
- **Global `focus-visible`** rule (`globals.css:76-79`) covers `a, button, input, select, textarea, [tabindex]` with a
  2px offset outline, plus a stronger `.field-input:focus` treatment.
- **Two `prefers-reduced-motion` blocks**, and `StorefrontHome` gates Framer Motion behind `useReducedMotion`.
- **`tests/a11y-smoke.test.ts` already exists** and is wired into the release gate (`scripts/release-gate.mjs`).

---

## Release-gate checklist

### Static assertions to add to `tests/a11y-smoke.test.ts`

- [ ] `PromotionPopup.tsx` imports `Modal` or `useDrawerA11y`
- [ ] `checkout/page.tsx` matches `htmlFor="checkout-{name,phone,address,promo}"` and `autoComplete="tel"`
- [ ] `checkout/page.tsx` contains `role="radiogroup"`; no `text-zinc-600`/`text-zinc-500` remains
- [ ] `dine/[tableToken]/page.tsx` contains `aria-label` and `htmlFor="dine-notes"`
- [ ] checkout + `appointments/book/page.tsx` each contain `role="status"` in the confirmation branch
- [ ] `storefront-shell.tsx` contains `aria-current`

### Manual gate (~15 min per release)

- [ ] Keyboard-only: `/shop` → add to bag → cart drawer → `/shop/checkout` → place order. No trap, focus always
      visible, focus lands somewhere meaningful after submit.
- [ ] Escape closes promo popup, cart drawer, and every POS modal; focus returns to the trigger.
- [ ] Screen reader (NVDA/VoiceOver) on checkout and `/shop/dine/[token]`: every field announces a label; confirmation announced.
- [ ] 400% zoom / 320px width on `/shop`, `/shop/checkout`, `/shop/menu` — no horizontal scroll or clipping.
- [ ] Reduced-motion on: cart drawer, promo popup, hero do not animate.
- [ ] Focus ring visible on both light and dark `--background`.

### Automated addition (recommended)

- [ ] `@axe-core/playwright` against `/shop`, `/shop/checkout`, `/shop/menu`, `/shop/dine/[token]`,
      `/shop/appointments/book`, `/pos` — pass condition: zero serious/critical violations. Carry the Lighthouse
      a11y score (target ≥95) via the existing `scripts/lighthouse-mobile.mjs`.

### Definition of done for new UI

- [ ] Accessible name on every interactive element; `<label htmlFor>` + `autoComplete` on every form control
- [ ] Every state change the user cares about is in a live region or moves focus; no state by color alone
- [ ] Targets ≥24×24 CSS px (≥44×44 for primary POS/mobile actions); text ≥4.5:1, borders and focus rings ≥3:1
- [ ] Dialogs use the shared `Modal`; drawers use `useDrawerA11y`
