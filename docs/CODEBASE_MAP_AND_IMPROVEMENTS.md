# Codebase Map & Improvements — Complete Solution

**Date:** 2026-09-11  
**Scope:** `src/` knowledge graph + design themes + agent harness + a11y/review tracks  
**Graph:** [`graphify-out/graph.html`](../graphify-out/graph.html) · [`GRAPH_REPORT.md`](../graphify-out/GRAPH_REPORT.md)

---

## 1. Verdict

Grabber POZ Solo is a **strong multi-vertical commerce OS**: auth and mutate gates are real hubs, commerce engines cluster cleanly, and vertical modules (restaurant, salon, repairs, creative, WhatsApp) are separable communities. The main remaining work is **ops** (secrets rotation + Contabo smoke), **a11y on storefront/checkout**, and **agent observation contracts** — not a core rewrite.

**This pass also shipped critical fixes:** guest QR orders now resolve price/name from catalog `productId`; table QR tokens use UUIDs; guest POST is IP rate-limited; marketing spend GET always requires session; restaurant patch guards for `tableId`/`ticketId`; QR dine-in a11y names + live region.

| Area | Grade | Note |
|------|-------|------|
| Auth / session gates | A | `getSession`, `assertCanMutateCommerce`, `requireStaffSession` dominate the graph |
| Commerce engines | A− | Pricing / inventory / tax / accounting / order SM are coherent |
| Vertical depth (café/salon) | B+ | Waves A–C shipped; re-seed floor for UUID QR tokens |
| Docs / release hygiene | B | Incident + PRODUCTION_READY; archive stale plans |
| Agent harness | B− | Propose→approve is right; lack `status`/`next_actions` |
| Public a11y | C+ → improving | Dine-in C3 fixed; checkout labels + PromotionPopup still open |
| Guest order security | B (was F) | Catalog-priced POST + UUID tokens + rate limit |
| Deploy secrets | C → fixed pattern | Never bake ARG secrets; rotate leaked keys |

---

## 2. Graphify map (`src/`)

**Corpus:** 488 files · ~234k words · **2600 nodes · 6627 edges · 165 communities**  
**Health:** WARNING — 986 dangling-endpoint edges + 169 collapsed undirected pairs (AST import noise / MultiDiGraph collapse). Graph is still usable for navigation; prefer hubs below over edge-perfect topology.

### What the codebase is good at

1. **Centralized auth spine** — almost every mutating surface hangs off session helpers (213 / 134 / 62 degree hubs). That is the right choke point for Solo multi-tenant safety.
2. **Commerce as engines** — `CommerceService`, pricing, promotions, inventory, accounting, and POS checkout form a clear community cluster (query hit: checkout ↔ engines ↔ restaurant/salon adapters).
3. **Vertical packs + flags** — setup presets and `verticalFlags` keep café/salon/repairs optional without forking the core.
4. **Approval / agent split** — R6 agents READ + PROPOSE; execute stays staff-gated (`docs/AGENTS.md` + harness).
5. **No import cycles** detected in the graph report.

### What to improve (prioritized)

| Priority | Issue | Why graph says so | Action |
|----------|-------|-------------------|--------|
| P0 | Coolify/runtime secrets | Ops, not graph | Rotate leaked keys; runtime-only env ([`DEPLOY_INCIDENT_COOLIFY_2026-09-11.md`](./DEPLOY_INCIDENT_COOLIFY_2026-09-11.md)) |
| P0 | Prod smoke QR→KOT / menu | Restaurant KDS community | Redeploy; **re-seed floor** (UUID tokens); hit `/shop/menu` + guest POST |
| P0 | Storefront a11y C1–C2 | A11Y_AUDIT | Wire `PromotionPopup` to `Modal`/`useDrawerA11y`; checkout `htmlFor` labels |
| P1 | Salon charge atomicity | CODE_REVIEW | Wrap complete+charge; settle_kot pre-validate |
| P1 | Low cohesion API blobs | Cron/Automation 0.05, Storefront 0.06 | Split route files by domain; shared `actor()` helpers |
| P1 | Agent observation shape | Isolated `AgentResult` nodes | Implement [`AGENT_HARNESS.md`](./AGENT_HARNESS.md) `status`/`next_actions` |
| P2 | 488 weakly connected nodes | Knowledge gaps | Prefer graphify query over re-reading; document bridges |
| P2 | Theme / brand variants | Storefront surface tokens only | Ship local themes; optional 21st publish |
| P3 | Thin Module communities | Many `<3` node clusters | Ignore unless a feature touches them |

### Fixed in this pass (was P0)

- Guest menu POST trusted client `price`/`name` → now `productId` + catalog resolve
- Predictable `t{time}{i}` QR tokens → `crypto.randomUUID()`
- No guest order rate limit → 20/min/IP in-process + middleware rule
- Marketing spend GET auth only in production → always require session
- `close_kot` / `update_table` missing id guards → explicit errors
- Dine-in icon-only buttons → `aria-label` + notes label + success live region
- AUTH_SECRET hardcode removed (prod throws); restaurant/appointments GET authed
- CSV formula injection neutralized; `bumpKdsTicket` SERVED+BOM atomic
- `useDrawerA11y` no longer steals focus; `PromotionPopup` uses focus trap

Still open (MEDIUM): N+1 campaign-roas batching, settle mid-split is mitigated (SETTLING + idempotency) but not a single DB transaction across POS checkouts.

## 3. Deliverables from this pass

| Deliverable | Path |
|-------------|------|
| Interactive graph | `graphify-out/graph.html` |
| Audit report | `graphify-out/GRAPH_REPORT.md` |
| Agent harness | `docs/AGENT_HARNESS.md` (linked from `AGENTS.md`) |
| Theme CSS (4) | `themes/mypoz-*.css` |
| Theme publish runbook | `docs/THEME_21ST_SYNC.md` |
| A11y audit | `docs/A11Y_AUDIT.md` (subagent) |
| Prod code review | `docs/CODE_REVIEW_VERTICAL_PROD.md` (subagent) |
| This solution | `docs/CODEBASE_MAP_AND_IMPROVEMENTS.md` |

### 21st Design Sync

Themes are **assembled and ready**. Publishing is **public** and needs your `21st_sk_…` key. Reply **yes + set `TWENTYFIRST_TOKEN`** to publish all four; until then they stay local (see `THEME_21ST_SYNC.md`).

---

## 4. Recommended execution plan (complete solution)

### Phase 0 — Ops (this week)

1. Rotate any secrets that appeared in Coolify build logs.
2. Contabo: runtime env only; rebuild from fixed commit; apply SQL `0011`–`0015` on tenant.
3. Smoke: `/api/health`, staff login, `/shop/menu`, QR guest order → KDS, salon book, marketing ROAS page.

### Phase 1 — Hardening (1–2 sprints)

1. Merge a11y remediations from `A11Y_AUDIT.md` into shop/POS (focus order, labels, contrast).
2. Close Critical/High from `CODE_REVIEW_VERTICAL_PROD.md`.
3. Agent harness: extend `AgentResult` + orchestrator catch contract; add one test.
4. Optionally split lowest-cohesion API route modules (cron/rules, storefront search).

### Phase 2 — Product polish

1. Wire `data-theme="ocean|salon"` from `themes/` into storefront if desired.
2. Publish 21st themes after confirm.
3. Keep graphify `--update` after large feature waves; query instead of full rebuild.

---

## 5. How to re-run the map

```powershell
# Incremental (preferred after edits)
# /graphify . --update   — or re-detect under src only if corpus > 500

# Query existing graph
graphify query "How does POS checkout reach inventory and tax engines?"
graphify query "Where does restaurant KDS connect to commerce?"
```

Full-repo detect exceeded 500 files; this map is intentionally scoped to **`src/`** (488 files).

---

## 6. Related SSOT

- [`PRODUCTION_READY.md`](./PRODUCTION_READY.md)
- [`VERTICAL_DEPTH_PLAN.md`](./VERTICAL_DEPTH_PLAN.md)
- [`FULL_PROOF_PLAN.md`](./FULL_PROOF_PLAN.md)
- [`AGENT_HARNESS.md`](./AGENT_HARNESS.md)
- [`THEME_21ST_SYNC.md`](./THEME_21ST_SYNC.md)
