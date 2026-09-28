# ERP Gaps, SSOT Verification & Next Wave

**Updated:** 2026-09-28
**Schema SSOT:** `src/db/schema.ts` + migrations `0018_erp_verticals.sql` through `0025_inventory_demand_planning.sql`
**Current schema footprint:** 107 table definitions in `src/db/schema.ts`

---

## Shipped ERP Foundations

| Area | Current status |
|------|----------------|
| POS / orders / stock / GL | Certified core with checkout, COD, split payments, stock ledger, returns, shifts, transfers, and journal invariants covered by tests. |
| Purchasing / GRN / AP | Purchase orders, purchase order lines, supplier accounts, supplier entries, AP invoices, AP payments, and AP journal posting exist. |
| HR / payroll | Employees, attendance, leave requests, payroll runs, payroll lines, EPF/ETF/PAYE stub, wage payment, statutory remittance, and payroll exports exist. |
| Vertical ERP depth | Pharmacy FEFO/controlled-drug logs, rental assets/contracts/deposits, restaurant KDS/menu/recipes, auto-parts fitment, repairs, warranties, and jewelry/watch vertical pack exist. |
| Company admin | Leads CRM, clients provisioning register, deployment register, company settings, SuperAdmin command center, roadmap, and audit trail are live. |
| Demand planning foundation | Forecast runs, forecast items, SKU classifications, replenishment recommendations, read-only planner UI, and snapshot persistence are live. |
| Compliance foundation | E-invoice submissions, email templates, and webhook event tables exist. |

---

## Still Deferred

These are the remaining ERP gaps before claiming “full ERP complete”:

1. **Purchase approval and supplier intelligence**
   - Purchase order approval workflow on top of existing PO/GRN/AP tables
   - Supplier scorecards
   - Cost price variance alerts
   - Suggested PO review queue

2. **Forecast accuracy and planning maturity**
   - WMAPE and bias reporting
   - Supplier-aware lead-time defaults
   - Owner/Admin approval flow from recommendation to purchase order

3. **Compliance certification**
   - Certified IRD e-invoice provider integration
   - Live VAT return pack
   - Official IRD PAYE tables replacing the current stub

4. **Operations depth**
   - Biometric attendance clocks
   - Rental charge to AR sales invoice auto-post
   - Multi-entity/group roll-up only if a future group SKU is approved, because it breaks the current Solo single-business mental model

---

## Company Admin Status

- `/company/leads`: live lead CRM.
- `/company/clients`: live client provisioning register.
- `/company/deployments`: live manual deployment register backed by `company_deployments`.
- `/company/settings`: live company profile/logo settings.
- `/company/admin`: live Owner/Admin command center.
- `/company/roadmap`: live readiness and roadmap surface.
- `/company/audit`: live read-only audit trail backed by `audit_logs`.

---

## Next Build Order

1. **PO approval workflow**
   - Add approval state and controlled transitions around existing `purchase_orders`.
   - Wire Owner/Admin/Manager approval before GRN/payment where required.

2. **Cost variance and supplier scorecards**
   - Compare purchase order cost, GRN cost, AP invoice cost, and last weighted average cost.
   - Surface alerts first; no automatic price mutation.

3. **Compliance pack**
   - Replace PAYE stub with official tables after source confirmation.
   - Wire certified IRD/e-invoice provider once credentials and provider contract are approved.

---

## Non-Negotiables

- No shared client database.
- No commerce, stock, payroll, or AP mutation outside canonical services.
- No automatic PO creation until deterministic recommendations are visible and accepted.
- No schema change without a numbered migration, tests, and docs update.
