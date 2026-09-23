# Grabber Business OS — System SSOT & Robustness Backlog

**Layer:** repo-owned durable knowledge (knowledge-ops L4)  
**Updated:** 2026-09-18  
**Live:** https://grabber-poz-solo.vercel.app · Contabo demo/HQ (redeploy for health metadata)

---

## What this is built as

Solo multi-vertical **commerce OS** on **Next.js App Router** + **Drizzle → Postgres** + Coolify Contabo / Vercel.

**Commercial SSOT:** Grabber is sold as **Grabber Business OS Pro**, one all-in-one plan. Business category is configured through vertical packs, not package tiers or upgrade gates.

| Surface | Purpose |
|---------|---------|
| `/pos`, `/barcodes` | Staff retail terminal + labels |
| `/shop/*` | Public storefront, dine QR, repairs, appointments |
| `/` | `LANDING_MODE` — company marketing **or** client storefront |
| `/restaurant`, KDS | Floor + kitchen tickets |
| `/setup` | M7 onboarding wizard + milestones |
| `/ai/agents` | R6 propose→approve agents (no LLM required v1) |
| Vertical modules | Salon, hire purchase, loyalty, wholesale, WhatsApp, creative |

---

## Source of truth (canonical anchors)

| Concern | SSOT |
|---------|------|
| Schema | `src/db/schema.ts` + `drizzle/migrations/` (through **0018** Wave E) |
| Vertical flags | 12 flags incl. `pharmacy`, `rental`, `autoParts` |
| DB client | `src/db/index.ts`, `src/lib/db/connection.ts` |
| Staff auth | `src/lib/auth/session.ts` (+ edge variant) |
| Commerce mutate gate | `assertCanMutateCommerce` |
| Checkout | `src/lib/commerce/pos-checkout-service.ts` |
| Business config / flags | `business-settings` + `vertical-flags` / `/api/config/flags` |
| Agents | `docs/AGENTS.md`, `src/lib/agents/*` |
| Print | `docs/PRINT_THERMAL.md`, `globals.css` print, `src/lib/print/*` |
| Ops readiness | `docs/PRODUCTION_READY.md` |
| Root `/` landing | `src/lib/config/landing-mode.ts` — `LANDING_MODE=company\|storefront\|auto` |
| Storefront CMS | `storefront-config` + `--sf-*` tokens; Wave B blocks (`HERO_SLIDER`, rich `ANNOUNCEMENT`) |
| Onboarding | `src/lib/setup/onboarding-milestones.ts` (`wizardSteps` + milestones) |
| ERP gaps / next | `docs/ERP_GAPS_AND_NEXT_WAVE.md` |
| ORM | **Drizzle only** (`POSTGRES_PRISMA_URL` is connection alias, not Prisma ORM) |

If a fact is in two places, **prefer schema + service layer over UI copy**.

---

## Robustness waves (2026-09)

| Wave | Outcome |
|------|---------|
| A | Landing dynamic imports, AppShell, shopper session dedupe, checkout a11y |
| B0–B2 | Restore AnnouncementBar/badges/brain/publish-links; server catalog; HERO_SLIDER |
| B3 | `/api/health` → `build` + `landingMode`; Contabo checklist (seed/PIN/lighthouse) |
| C | POS types extract; CompanyLanding below-fold dynamic; `npm run analyze:sizes` |
| **Next** | **M7** owner onboarding wizard (S1 shell shipped) |

---

## Apple-CEO robustness backlog (shortcomings → fixes)

Think “delight + integrity under load,” not feature sprawl.

### P0 — Trust & identity (ship blockers)

1. **No production demo PIN** — staff login must never mint OWNER from `1234` on live. Demo UI only in non-prod. *(Fixed 2026-09-11.)*
2. **Supervisor PIN ≠ session swap** — void/discount/drawer verify via dedicated API without re-login. *(Fixed.)*
3. **License HMAC** — refuse default signing key in production. *(Fixed.)*
4. **Rotate leaked Coolify / env secrets** on Contabo tenants; confirm `AUTH_SECRET` unique per install.
5. **Golden tenant** — one Contabo café/salon with real stock, UUID QR tables, Sentry on, demo seed scrubbed.

### P1 — Commerce integrity

6. **Order idempotency** — `orders.client_uuid` unique index. *(Migration `0016`.)*
7. **Guest menu** — POST only `PREPARED_FOOD`/`SERVICE`; collision-safe `kotNumber`. *(Fixed.)*
8. **SETTLING** status documented in schema + TS unions. *(Fixed.)*
9. **POS vs storefront stock** — no sell-from-zero without explicit oversell. *(POS gate added.)*
10. **Catalog honesty** — collapse demo variant spam; seed sellable SKUs so storefront converts.

### P2 — Product polish (Apple bar)

11. **One storefront identity** — same theme tokens on menu/book/repairs. *(Generator pass.)*
12. **Contrast** — `--sf-on-surface` for text on dark surfaces. *(Generator pass + M8.)*
13. **Observability** — Sentry on; `/api/health` exposes `build` + `landingMode` *(code done; Contabo redeploy needed)*.
14. **Offline POS** — proven hold/sync under flaky WAN for Contabo Solo shops.
15. **Print path** — staff training: Chrome margins None; thermal presets documented.

### P3 — Business packaging (what clients buy)

16. Freeze verticals → **Café Solo** or **Salon Solo** SKU with fixed price + onboarding checklist.
17. Approval Center as the only “AI” promise for v1 (propose → staff approve).
18. Paying pilot + weekly ops review before next vertical depth wave (pharmacy/rental/auto-parts).

---

## GAN live eval

### Pass 1 — 2026-09-11 pre-deploy
Target: production Vercel. **FAIL 6.9/10** (threshold 7.0).
Critical: public demo PIN minted OWNER without DB.

### Pass 2 — 2026-09-11 post-push
Code integrity checklist **10/10 OK**. Remaining gap is **ops/data** (rotate seed PINs, seed stock, Sentry on, migration `0016`).

### Pass 3 — 2026-09-18 health metadata
- Vercel `/api/health` → `build`, `landingMode: company`, `db:connected` ✓
- Contabo demo/HQ → `db:connected` but **no** `build`/`landingMode` yet → **redeploy** latest image

---

## Ruflo note

Multi-agent orchestration (`npx ruflo`) is optional. Prefer main-thread fix → GAN eval until swarm memory is needed across machines.

---

## Related docs

- [`AGENTS.md`](./AGENTS.md) · [`AGENT_HARNESS.md`](./AGENT_HARNESS.md)
- [`ERP_GAPS_AND_NEXT_WAVE.md`](./ERP_GAPS_AND_NEXT_WAVE.md)
- [`WAVE_B_C_ROBUSTNESS_PLAN.md`](./WAVE_B_C_ROBUSTNESS_PLAN.md) · [`WAVE_B3_OPS_CHECKLIST.md`](./WAVE_B3_OPS_CHECKLIST.md)
- [`CODEBASE_MAP_AND_IMPROVEMENTS.md`](./CODEBASE_MAP_AND_IMPROVEMENTS.md)
- [`PRINT_THERMAL.md`](./PRINT_THERMAL.md) · [`THEME_21ST_SYNC.md`](./THEME_21ST_SYNC.md)
