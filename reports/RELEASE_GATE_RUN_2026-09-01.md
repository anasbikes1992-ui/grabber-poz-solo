# Release Gate Run — 2026-09-01 (production + local sweep)

**Command:**

```powershell
npm run release:gate -- --env-file .env.prod.txt --production --http
```

**Production:** https://grabber-poz-solo.vercel.app  
**Supabase:** `rbayhrskowtahepwccrq` (ap-southeast-1, pooler)  
**Unit tests:** 64/64 pass · typecheck green

---

## Automated results

| Gate | Check | Result | Notes |
|------|-------|--------|-------|
| R1 | `env:validate` | PASS | WhatsApp active |
| R1 | `db:test-rls` | PASS | Prod pooler |
| R1 | `typecheck` | PASS | |
| R1 | `npm test` | PASS | 64 tests |
| R1 | `client:certify:http` | **PARTIAL** | `/shop/repairs*` 404 until next Vercel deploy |
| R2 | Commerce tests | PASS | 34 tests |
| R3 | Storefront tests | PASS | 9 tests |
| R4 | WhatsApp + repair automation | PASS | 10 tests |
| R5 | Jarvis metrics | PASS | 7 tests |
| R6 | Agent registry | PASS | 12 agents, 5 registry tests |
| R7 | Creative approve path | MVP | Studio + `/api/creative/approve` |

---

## Shipped since last report (local — deploy to activate on prod)

| Feature | Routes |
|---------|--------|
| Public repairs storefront | `/shop/repairs`, `/shop/repairs/request`, `/shop/repairs/track` |
| Repair WhatsApp automations | `REPAIR_CREATED`, `REPAIR_READY` |
| Storefront shell + mobile nav | Products · Repairs · Track · Bag |
| 12 vertical agents | `/ai/agents`, `/api/agents/run`, `/api/agents/brief` |

**Deploy step:** push to `poz-solo/main` → Vercel redeploy → re-run HTTP cert (repairs routes should return 200).

---

## Manual sign-off still open

| ID | Item | Owner |
|----|------|-------|
| R1-M1 | Rotate owner PIN | Operator |
| R4-M1 | Meta webhook verify | Operator |
| R4-M2 | WhatsApp delivery proof in `automationLogs` | Operator |
| RT-M01–M08 | Manual commerce smoke | Operator |
| R3-M1 | Mobile Lighthouse | Operator |
| R5-M1 | Jarvis vs dashboard live parity | Operator |
| R6-M1 | Agent → Approval Center EXECUTE | Engineering |
| R2-O1 | Stock reservation API (optional) | Engineering |

---

## Related

- [`docs/RELEASE_GATE.md`](../docs/RELEASE_GATE.md)
- [`docs/AGENTS.md`](../docs/AGENTS.md)
- [`docs/REPAIRS_STOREFRONT_BLUEPRINT.md`](../docs/REPAIRS_STOREFRONT_BLUEPRINT.md)
