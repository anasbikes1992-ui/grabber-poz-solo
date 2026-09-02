# Grabber Business OS — Documentation Index (SSOT)

**Product:** Grabber Business OS (Solo / dedicated single-business instance)  
**Default host:** Grabber Managed **VPS** ([`VPS_DEPLOY.md`](./VPS_DEPLOY.md)) · Vercel optional  
**Commercial:** Perpetual license + Infrastructure & Maintenance ([`COMMERCIAL_MODEL.md`](./COMMERCIAL_MODEL.md))  
**Schema SSOT:** `src/db/schema.ts` (~49 tables)  
**Last doc refresh:** 2026-09-02

Use this index to decide **which document is authoritative**. Do not cite superseded or historical docs for client contracts or warranty claims.

---

## 1. Authoritative (use for clients, sales, ops, claims)

| Document | Purpose |
|----------|---------|
| [`COMMERCIAL_MODEL.md`](./COMMERCIAL_MODEL.md) | **Pricing & license model** (perpetual + monthly infra; AI credits). |
| [`CLAIMS_AND_SCOPE.md`](./CLAIMS_AND_SCOPE.md) | **What we may claim** vs deferred / optional. |
| [`CLIENT_DELIVERABLES.md`](./CLIENT_DELIVERABLES.md) | What the client receives at each package. |
| [`SOFTWARE_PLAYBOOK.md`](./SOFTWARE_PLAYBOOK.md) | Provision → certify → pilot → handover. |
| [`VPS_DEPLOY.md`](./VPS_DEPLOY.md) | **Default production deploy** on VPS + Sentry. |
| [`STAGE_READINESS.md`](./STAGE_READINESS.md) | Readiness + physical testing. |
| [`CLIENT_ONBOARDING_CREDENTIALS.md`](./CLIENT_ONBOARDING_CREDENTIALS.md) | Intake checklist. |
| [`VERCEL_ENV.md`](./VERCEL_ENV.md) | Environment variables (host-agnostic; filename legacy). |
| [`RELEASE_GATE.md`](./RELEASE_GATE.md) | R1–R7 gates. |
| [`READY_FOR_RETESTING.md`](./READY_FOR_RETESTING.md) | Pre-pilot checklist. |
| [`certification/CLIENT_ACCEPTANCE_TEST.md`](./certification/CLIENT_ACCEPTANCE_TEST.md) | 7-day acceptance. |
| [`certification/CERTIFICATION_LEVELS.md`](./certification/CERTIFICATION_LEVELS.md) | L1–L4 meaning. |
| [`AGENTS.md`](./AGENTS.md) | Agent orchestrator. |
| [`FRESH_START.md`](./FRESH_START.md) | Alternate: Supabase + Vercel bootstrap. |

---

## 2. Product surfaces (current)

| Surface | Path | Audience |
|---------|------|----------|
| Public storefront | `/` | Shoppers |
| Shopper login / account | `/shop/login`, `/shop/account` | Customers |
| Staff login | `/adminpoz` | Staff (PIN) |
| Staff hub | `/app` | Staff |
| Counter POS | `/pos` | Cashiers |
| Social Channel Manager | `/social` | Marketing / owner |
| Creative Engine | `/creative/*` | Marketing |
| WhatsApp center | `/whatsapp` (also `/social?tab=whatsapp`) | Ops |
| Agents | `/ai/agents` | Owner / manager |

**Legacy redirect:** `/marketing` → `/social?tab=channels`

---

## 3. Historical / architecture (not for contracts)

These describe vision or past trackers. Prefer §1 for **scope of delivery**.

| Document | Note |
|----------|------|
| `correction.md` | Internal fix tracker (waves). Historical. |
| `IMPLEMENTATION_MAP.md`, `ROADMAP.md`, `NEXT_PHASES.md` | Engineering roadmap — may lag UI. |
| `BUSINESS_OS_*.md` (architecture series) | Design intent; verify against code before claiming. |
| `GTM_MARKETING_PLAN.md` | Sales pricing ideas — **must match** `CLAIMS_AND_SCOPE.md`. |
| `TECHNICAL_HANDOVER_GUIDE.md` | **Superseded** by `SOFTWARE_PLAYBOOK.md` (do not use 41-table / setup.sql path). |
| `REPAIRS_STOREFRONT_BLUEPRINT.md` | Blueprint; repairs MVP may be partial. |

---

## 4. Hard rules for documentation & claims

1. **Never** put live DB passwords, API tokens, or client PINs in docs.  
2. **Never** claim live GPU AI video unless `CREATIVE_WORKER_URL` is deployed and acceptance-tested.  
3. **Never** claim online card checkout (PayHere/Stripe) as default — storefront is **COD** unless gateway is contracted and configured.  
4. **Never** reuse demo PIN `1234` or demo phone `+94771234567` on a client production instance after handover.  
5. Automated `client:certify` = **schema + synthetic SQL** (+ optional HTTP). It does **not** replace physical POS or 7-day acceptance.  
6. One business = one dedicated Supabase database. Do not share demo DB with paying clients.

---

## 5. Quick commands

```powershell
npm run typecheck
npm test
npm run env:validate -- --env-file .env.client-production --production
npm run release:gate -- --env-file .env.client-production --production --http
npm run client:certify -- --client "Client Name" --slug "client-slug"
```
