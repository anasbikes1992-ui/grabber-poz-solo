# Grabber Business OS — System SSOT & Robustness Backlog

**Layer:** repo-owned durable knowledge (knowledge-ops L4)  
**Updated:** 2026-09-11  
**Live:** https://grabber-poz-solo.vercel.app

---

## What this is built as

Solo multi-vertical **commerce OS** on **Next.js App Router** + **Drizzle → Postgres (Supabase)** + Coolify Contabo / Vercel.

| Surface | Purpose |
|---------|---------|
| `/pos`, `/barcodes` | Staff retail terminal + labels |
| `/shop/*` | Public storefront, dine QR, repairs, appointments |
| `/restaurant`, KDS | Floor + kitchen tickets |
| `/ai/agents` | R6 propose→approve agents (no LLM required v1) |
| Vertical modules | Salon, hire purchase, loyalty, wholesale, WhatsApp, creative |

---

## Source of truth (canonical anchors)

| Concern | SSOT |
|---------|------|
| Schema | `src/db/schema.ts` + `drizzle/migrations/` |
| DB client | `src/db/index.ts`, `src/lib/db/connection.ts` |
| Staff auth | `src/lib/auth/session.ts` (+ edge variant) |
| Commerce mutate gate | `assertCanMutateCommerce` |
| Checkout | `src/lib/commerce/pos-checkout-service.ts` |
| Business config / flags | `business-settings` + `vertical-flags` / `/api/config/flags` |
| Agents | `docs/AGENTS.md`, `src/lib/agents/*` |
| Print | `docs/PRINT_THERMAL.md`, `globals.css` print, `src/lib/print/*` |
| Ops readiness | `docs/PRODUCTION_READY.md` |
| Root `/` landing | `src/lib/config/landing-mode.ts` — `LANDING_MODE=company\|storefront` |
| ORM | **Drizzle only** (`POSTGRES_PRISMA_URL` is connection alias, not Prisma ORM) |

If a fact is in two places, **prefer schema + service layer over UI copy**.

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
12. **Contrast** — `--sf-on-surface` for text on dark surfaces. *(Generator pass.)*
13. **Observability** — Sentry on; `/api/health` should expose build SHA.
14. **Offline POS** — proven hold/sync under flaky WAN for Contabo Solo shops.
15. **Print path** — staff training: Chrome margins None; thermal presets documented.

### P3 — Business packaging (what clients buy)

16. Freeze verticals → **Café Solo** or **Salon Solo** SKU with fixed price + onboarding checklist.
17. Approval Center as the only “AI” promise for v1 (propose → staff approve).
18. Paying pilot + weekly ops review before next vertical depth wave.

---

## GAN live eval

### Pass 1 — 2026-09-11 pre-deploy
Target: production Vercel. **FAIL 6.9/10** (threshold 7.0).
Critical: public demo PIN minted OWNER without DB. Also: invisible dark CTAs, theme drift menu vs home, sold-out catalog, POS allowed stock 0.

### Pass 2 — 2026-09-11 post-push (`0b59032` on `main`)
Code integrity checklist **10/10 OK** (demo gate, supervisor-pin, license throw, menu filters, unique `client_uuid`, `--sf-on-surface`, shopper anon 200).

Live probes:
- `/adminpoz` — demo copy + Fill Demo PIN **gone** ✓
- `POST /api/auth/login` with unknown email + `1234` → **401** (no synthetic demo user) ✓
- `POST` with role OWNER + `1234` (no email) → **200 real seed user** `owner@store.local` — not `demo:true`, but **weak seed PIN still opens OWNER** ⚠
- `/shop` + `/shop/menu` — same dark theme ✓; CTA contrast improved ✓
- Catalog / dining menu — **empty** (“0 items” / “seed restaurant preset”) — conversion still blocked
- `/api/health` — `db:connected`, `sentry:off`
- Shopper GET anonymous → **200** ✓

**Verdict:** eng hardening **landed**; remaining gap is **ops/data** (rotate seed PINs, seed stock + restaurant menu, Sentry on, apply migration `0016` on DB).

---

## Ruflo note

Multi-agent orchestration (`npx ruflo`) is optional overhead here. Prefer cavecrew locate → main/generator fix → GAN eval for this repo until swarm memory is needed across machines.

---

## Related docs

- [`AGENTS.md`](./AGENTS.md) · [`AGENT_HARNESS.md`](./AGENT_HARNESS.md)
- [`CODEBASE_MAP_AND_IMPROVEMENTS.md`](./CODEBASE_MAP_AND_IMPROVEMENTS.md)
- [`PRINT_THERMAL.md`](./PRINT_THERMAL.md) · [`THEME_21ST_SYNC.md`](./THEME_21ST_SYNC.md)
