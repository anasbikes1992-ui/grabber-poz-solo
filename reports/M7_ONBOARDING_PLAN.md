# M7 — Client Onboarding Plan

**Status:** 🟠 NEXT  
**Depends on:** M2 Security 🟢 · M3 Commerce 🟢 · M6 Installation Identity 🟢  
**Goal:** Fresh install → owner completes an interactive wizard → store is sellable without engineering help.

Not in M7: catalog Excel import (M8), UI redesign, multi-tenant, checkout rewrite.

---

## Problem

Today `/setup` is a **milestone checklist** (seed / preset / links). Ops still relies on:

- `CLIENT_ONBOARDING_PLAYBOOK.md` (manual)
- `npm run env:validate` / seed / certify outside the product UI
- Owner PIN rotation as a manual gate

M7 turns that into a **productized 11-step owner wizard** for a single-business install.

---

## Target flow (11 steps)

```text
1. Welcome + installation identity (read M6 license/install id)
2. Business profile (name, vertical preset, currency LKR)
3. Owner account (create / rotate off TEMP$ PIN)
4. Branch + register bootstrap
5. Tax profile confirm (STANDARD_VAT from seed — editable rate)
6. Chart of accounts confirm (ensureDefaultChartOfAccounts)
7. Catalog kickstart (seed preset OR skip to M8 import)
8. Payments (COD on; optional PayHere/WebXPay keys)
9. Storefront basics (theme + contact / WhatsApp number)
10. Integrations optional (WhatsApp, courier) — skippable
11. Certification gate (env:validate summary + auth:coverage + smoke links)
```

Exit: `setup.completedAt` (or equivalent) set · owner can open `/pos` and `/shop` · release smoke checklist green.

---

## Bounded first slice (implement next)

**M7-S1 — Wizard shell + progress SSOT**

1. Extend `/api/setup/progress` with ordered wizard steps + `currentStep` + persistence in `business_config`.
2. Replace checklist-only UX with step wizard (reuse existing seed/preset actions).
3. Block “complete” until: DB connected, seeded, OWNER PIN not `TEMP$`, at least one branch.
4. Tests: `tests/onboarding-wizard.test.ts` for step gating.

**Out of S1:** payment key forms, WhatsApp OAuth, Excel import.

---

## Later slices

| Slice | Focus |
|-------|--------|
| M7-S2 | Owner credential rotation inside wizard |
| M7-S3 | Tax + COA confirmation screens |
| M7-S4 | Payments + storefront contact |
| M7-S5 | In-app certification panel (env + HTTP smoke links) |
| M7-S6 | Docs + `release:gate-m7` |

---

## Evidence already available

- `/setup` + `/api/setup/progress`
- Seed + vertical presets
- M6 installation identity
- `docs/CLIENT_ONBOARDING_PLAYBOOK.md` (ops companion — keep; wizard is product UI)

---

## Done when

```text
Fresh Vercel + Supabase
  → open /setup
  → complete wizard without CLI
  → /pos sale + /shop COD path work
  → npm run release:gate-m7 PASS
```
