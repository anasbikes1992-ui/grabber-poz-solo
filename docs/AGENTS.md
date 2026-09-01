# Grabber Business OS — Agent Orchestrator (R6)

Deterministic, DB-grounded agents for core commerce and every vertical module.  
No LLM required for v1 — agents **READ** live data and **propose** actions; staff **approve** via Approval Center.

**UI:** `/ai/agents` · **API:** `/api/agents/run` · **Brief:** `/api/agents/brief`

**Registry:** `src/lib/agents/registry.ts` · **Handlers:** `src/lib/agents/handlers.ts`

---

## Agent catalog (12)

| ID | Label | Category | Vertical flag | Data source |
|----|-------|----------|---------------|-------------|
| `SALES` | Sales Agent | core | — | `orders` (today + pending COD) |
| `INVENTORY` | Inventory Agent | core | — | `stock_balances` + reorder |
| `MARKETING` | Marketing Agent | core | — | Brand/automation hints |
| `REPAIR` | Repair Agent | vertical | `repairs` | `repair_jobs` |
| `RESTAURANT` | Restaurant Agent | vertical | `restaurant` | `dining_tables`, `kitchen_tickets` |
| `HIRE_PURCHASE` | Hire Purchase Agent | vertical | `hirePurchase` | `hire_purchase_contracts` |
| `APPOINTMENTS` | Appointments Agent | vertical | `appointments` | `appointments` |
| `LOYALTY` | Loyalty Agent | vertical | `loyalty` | `loyalty_members` |
| `WHOLESALE` | Wholesale / B2B Agent | vertical | `wholesale` | `quotations` collection |
| `POLIM` | Polim Potha Agent | vertical | — | `polim_potha_accounts` |
| `WHATSAPP` | WhatsApp Agent | communication | `whatsapp` | `automationLogs` |
| `CREATIVE` | Creative Agent | communication | `creative` | `creative_projects` |

`POLIM` is always enabled (core credit ledger). Other vertical agents require the matching flag in `business_config.verticalFlags` (Settings / `/api/config/flags`).

---

## API

```powershell
# List registry + enabled agents
curl https://grabber-poz-solo.vercel.app/api/agents/run

# Run one agent (staff session in production)
curl -X POST https://grabber-poz-solo.vercel.app/api/agents/run `
  -H "Content-Type: application/json" `
  -d '{"agent":"REPAIR","prompt":"Daily briefing"}'

# Run all enabled agents
curl -X POST https://grabber-poz-solo.vercel.app/api/agents/run `
  -H "Content-Type: application/json" `
  -d '{"all":true}'

# Combined daily brief (GET, staff session)
curl https://grabber-poz-solo.vercel.app/api/agents/brief
```

Logs append to `business_config.agentLogs` (last 200 entries).

---

## Pipeline (target)

```text
Agent READ (handlers.ts)
    → recommendations[] + metrics
    → agentLogs
    → Approval Center PROPOSE (actionable recommendations → createApproval)
    → EXECUTE with confirmationToken (staff at /approvals)
    → audit_logs
```

Actionable patterns (PO lines, repair tickets, EMI collection, KOT serve, creative promos) auto-create **DRAFT** approvals when agents run with a staff session.

---

## Tests

```powershell
npm test -- tests/agents-vertical.test.ts
npm run release:gate -- --env-file .env.prod.txt --production
node scripts/release-gate.mjs r6 --env-file .env.prod.txt --production
```

---

## Related

- [`RELEASE_GATE.md`](./RELEASE_GATE.md) — R6 exit criteria
- [`REPAIRS_STOREFRONT_BLUEPRINT.md`](./REPAIRS_STOREFRONT_BLUEPRINT.md) — repairs + agents plan
- [`ROADMAP.md`](./ROADMAP.md) — release train
