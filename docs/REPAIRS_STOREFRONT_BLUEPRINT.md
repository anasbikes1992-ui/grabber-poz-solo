# Repairs + Storefront Blueprint — Analysis & Plan

**Reference:** Manus AI blueprint (Sep 2026) · Mister Mobile service discovery · Grabber Poz Solo live stack.

**Design system:** [`design-system/grabber-poz-solo/MASTER.md`](../design-system/grabber-poz-solo/MASTER.md) · [`pages/repairs.md`](../design-system/grabber-poz-solo/pages/repairs.md)

---

## What the blueprint gets right (keep)

| Idea | Why it fits Grabber |
|------|---------------------|
| **Products ≠ Repairs** | Repairs are tickets/workflow objects, not cart SKUs — matches `repair_jobs` table |
| **Dual nav: Products + Repairs** | Same POS inventory authority; parts consumed on ticket, not at browse time |
| **Guided intake wizard** | Reduces bad estimates; supports “inspection required” honesty |
| **Ticket code + phone track** | No account required for MVP; signed-in history can follow |
| **Staff queue + status machine** | Aligns with existing `/repairs` staff surface |
| **WhatsApp on status events** | Uses existing automation engine + Graph API |
| **Stone/gold premium UI** | Already in design system; repair accent (teal) for scanability |

## What we adjusted (Grabber-specific)

| Blueprint | Grabber decision |
|-----------|------------------|
| Public `/repairs` | **`/shop/repairs`** — staff stays at `/repairs` (middleware staff surface) |
| Staff `/staff/repairs` | **`/repairs`** (existing) + header link |
| Full 0003 schema (RepairRule, RepairPart…) | **Phase 2** — MVP uses `checklist_json` + existing columns |
| WooCommerce-style categories | **Config-driven** `REPAIR_SERVICES` in code → DB config later |
| Home visit slot engine | **Phase 2** — capture preference text now; capacity rules later |

---

## Implemented in this sprint (MVP)

| Item | Route / file |
|------|----------------|
| Repairs landing + 8 service cards | `/shop/repairs` |
| 5-step request wizard | `/shop/repairs/request` |
| Track by ticket + phone | `/shop/repairs/track` |
| Public intake API | `POST /api/repairs/public` |
| Storefront shell (Products, Repairs, mobile bar) | `StorefrontShell` |
| Homepage repair CTA | `/` hero |
| WhatsApp automations | `REPAIR_CREATED`, `REPAIR_READY`, `REPAIR_STATUS_CHANGED` |
| Repair agent (R6) | `REPAIR` + 11 vertical/core agents | [`AGENTS.md`](./AGENTS.md) |
| Staff status updates + WhatsApp on READY | `/repairs` table + PATCH |
| Theme alignment | Stone/gold default, Rubik/Nunito fonts, repair tokens |

---

## Phase 2 — Operations depth

1. **DB migration `0004_repairs_extended.sql`** — `repair_events`, `repair_estimates`, `repair_parts` (link to `products`)
2. **Staff ticket workspace** — `/repairs/[id]` three-column layout (diagnosis, parts, payments)
3. **Price rules admin** — brand/model matrix in `business_config.repairRules`
4. **Parts consume from POS** — barcode attach → stock movement
5. **Slot capacity** — branch/technician calendar
6. **Customer `/shop/account/repairs`** — history for logged-in shoppers

---

## Phase 3 — R6 Agents + R7 Creative (unblocked plan)

### R6 Agents (deterministic → approval)

| Agent | Trigger | Output |
|-------|---------|--------|
| SALES | Daily / manual | COD follow-ups, revenue summary |
| INVENTORY | Low stock | Draft PO suggestions → Approval Center |
| MARKETING | Weekly | Promo + creative brief drafts |
| REPAIR | Open queue | Estimate follow-ups, ready-for-pickup list |
| RESTAURANT | Floor service | Open KOTs, table turnover |
| HIRE_PURCHASE | EMI calendar | Overdue collections, settlements |
| APPOINTMENTS | Daily schedule | Today's slots + 24h lookahead |
| LOYALTY | Member base | Tier upgrades, point redemption |
| WHOLESALE | B2B quotes | Open/expiring quotations |
| POLIM | Credit ledger | Outstanding balance reminders |
| WHATSAPP | Automation logs | Failed sends, rule health |
| CREATIVE | Studio queue | Campaigns awaiting approve-publish |

**Pipeline:** Agent run → `agentLogs` → staff approves → EXECUTE (existing approval tokens) → audit.

**API:** `POST /api/agents/run` · `{ all: true }` · `GET /api/agents/brief`

### R7 Creative

| Asset | Source | Publish target |
|-------|--------|----------------|
| Hero banner | Creative Studio brief | `storefront` CMS block |
| Repair promo strip | Template “Repairs from LKR …” | `/shop/repairs` announcement |
| WhatsApp template | Brand brain voice | Automation rule text |

**Requires:** `FAL_KEY` or `REPLICATE_API_TOKEN` for live media; stub works for layout approval flow today.

---

## WhatsApp automation map

| Event | When | Default action |
|-------|------|----------------|
| `ORDER_CREATED` | Storefront COD | Order confirm text |
| `REPAIR_CREATED` | Public wizard submit | Ticket received text |
| `REPAIR_READY` | Staff sets READY | Pickup ready text |
| `REPAIR_STATUS_CHANGED` | Other status PATCH | Log (extend to SMS later) |

Configure/disable in **Settings → Automation**.

---

## Success metrics (from blueprint)

| Metric | Tool |
|--------|------|
| Repair CTA CTR | Storefront analytics / `/shop/repairs` views |
| Wizard completion | `repair_jobs` where `checklist_json.source = STOREFRONT` |
| Time to estimate | `INTAKE` → `ESTIMATE_SENT` timestamps (Phase 2 events) |
| Parts variance | Ticket parts vs stock movements (Phase 2) |

---

## Test

```powershell
npm test
npm run release:gate -- --env-file .env.prod.txt --production --http
node scripts/release-gate.mjs r6 --env-file .env.prod.txt --production
```

Manual: submit `/shop/repairs/request` → track → staff `/repairs` set READY → check automation logs + WhatsApp.
