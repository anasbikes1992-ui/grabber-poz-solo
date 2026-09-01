# Grabber Business OS — Release Gate

Ship / no-ship checklist for MyPoz Solo releases.  
Aligned with master prompt §118 and [`ROADMAP.md`](./ROADMAP.md).

**Verdict values:** `READY` · `CONDITIONALLY READY` · `BLOCKED`

---

## Current overall verdict

| Release | Verdict | Blocker |
|---------|---------|---------|
| **R1** Solo Foundation | **CONDITIONALLY READY** | Run `db:apply-rls` on each new Supabase project |
| **R2** Commerce Complete | **CONDITIONALLY READY** | Refunds + reservations still open |
| **R3** Storefront | **CONDITIONALLY READY** | CMS + checkout done; Lighthouse budgets open |
| **R4** Communication | **CONDITIONALLY READY** | Automation + webhook stub; live WhatsApp needs credentials |
| **R5** Jarvis | **CONDITIONALLY READY** | Approval Center + brief; full EXECUTE audit trail partial |
| **R6–R7** | **BLOCKED** | Agent/creative depth deferred |

**Production today:** Core POS + inventory ops can run after `db:bootstrap` + seed. Do not claim full Business OS until R3+.

---

## Gate matrix

| Section | R1 | R2 | R3 | R4 | R5 | Evidence |
|---------|:--:|:--:|:--:|:--:|:--:|----------|
| **DATABASE** | 🟡 | — | — | — | — | `db:bootstrap`, certify L4 |
| **AUTH** | 🟢 | — | — | — | 🟡 | Staff + shopper sessions |
| **SECURITY** | 🟡 | — | — | — | 🟡 | RLS SQL exists; not auto-probed |
| **POS** | 🟢 | 🟡 | — | — | — | Checkout + shifts |
| **INVENTORY** | 🟢 | 🟡 | — | — | — | GRN + transfers |
| **PURCHASING** | 🟢 | — | — | — | — | PO + GRN |
| **STORE** | — | — | 🟡 | — | — | SSR `/products/[slug]` + home catalog |
| **ORDERS** | 🟡 | 🟡 | — | — | — | Unified state machine (S3) |
| **PAYMENTS** | 🟢 | 🟡 | — | — | — | Split pay done (S3) |
| **WHATSAPP** | — | — | — | 🟡 | — | Webhook + send stub |
| **AUTOMATION** | — | — | — | 🟡 | — | config_json rules engine |
| **JARVIS** | — | — | — | — | 🟡 | DB tools + approval queue |
| **AGENTS** | — | — | — | — | 🟡 | Stub orchestrator (S11+) |
| **CREATIVE ENGINE** | — | — | — | — | 🟡 | Generate only |
| **SEO** | — | — | 🟡 | — | — | Meta + JSON-LD + sitemap (S5) |
| **PERFORMANCE** | 🟡 | — | 🟡 | — | — | No formal budgets |
| **DEPLOYMENT** | 🟢 | — | — | — | — | Vercel + Supabase |
| **BACKUP** | 🟡 | — | — | — | — | Export API exists |
| **TESTING** | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 25 unit; no full E2E |

Legend: 🟢 pass · 🟡 partial · 🔴 fail · — not in scope for release

---

## R1 exit criteria (Solo Foundation)

- [x] Numbered migrations `0000`–`0002` in repo
- [x] `npm run db:bootstrap` documented and runnable
- [x] `client:certify` L4 SQL passes on seeded DB
- [x] Jarvis uses real staff session (not hardcoded owner)
- [x] 10+ DB-grounded Jarvis READ tools
- [ ] RLS applied on host + automated policy test
- [ ] Legacy sync triggers removed OR documented drop plan
- [ ] Settings pages persist to `business_config` (not local toast)

**R1 sign-off command:**

```bash
npm run env:validate
npm run db:bootstrap -- --certify
# POST /api/seed (dev)
npm run typecheck && npm test
```

---

## R2 exit criteria (Commerce Complete)

- [x] Single order state machine for POS + storefront + admin
- [x] Server-side promotion rules engine
- [x] Split payment in checkout
- [x] POS hold / resume verified
- [x] Product variants end-to-end
- [x] Import validate → commit pipeline

---

## R3 exit criteria (Storefront)

- [x] SSR `/products/[slug]` with meta + Product JSON-LD
- [x] `/sitemap.xml` + `/robots.txt`
- [x] Persisted homepage blocks (CMS in `business_config.config_json.storefront`)
- [x] Theme token system (primary color + WhatsApp number)
- [x] Guest + account checkout with COD (`/shop/checkout`)
- [ ] Mobile Lighthouse acceptable on product + checkout

---

## R4 exit criteria (Communication)

- [x] Automation rules in `business_config` + event log
- [x] `ORDER_CREATED` → WhatsApp template action (stub send + audit log)
- [x] Inbound webhook handler (`/api/webhooks/whatsapp`)
- [x] Idempotent message delivery log (`automationLogs`)

---

## R5 exit criteria (Jarvis)

- [x] Approval Center UI for EXECUTE tools (`/approvals`)
- [x] Daily brief from deterministic metrics (`/api/jarvis/brief`)
- [ ] HTTP E2E: Jarvis `get_sales_summary` matches dashboard
- [ ] Agent execution audit trail (full R6)

---

## Doc §106 E2E (full Business OS)

Full master workflow test — **BLOCKED** until R4–R6:

```text
Fresh DB → migrate → seed → POS sale → storefront COD →
WhatsApp notify → complete order → Jarvis sales query →
creative draft → owner approve → campaign execute
```

Track progress in [`correction.md`](./correction.md) item `E2E-01`.

---

## Honesty rules (from Wave 0)

1. Do not claim RLS/CDN/API cert unless automated probes pass.
2. Do not claim WhatsApp live unless credentials set and delivery logged.
3. Do not claim SEO-ready storefront until SSR + sitemap exist.
4. Database truth > documentation > AI interpretation.

---

## Related

- [`correction.md`](./correction.md)
- [`READY_FOR_RETESTING.md`](./READY_FOR_RETESTING.md)
- [`certification/CERTIFICATION_LEVELS.md`](./certification/CERTIFICATION_LEVELS.md)
