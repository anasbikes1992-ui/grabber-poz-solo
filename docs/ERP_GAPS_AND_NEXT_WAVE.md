# ERP Gaps, SSOT Verification & Next Wave

**Updated:** 2026-09-18 (Wave G payroll ops / vertical depth)  
**Schema SSOT:** `src/db/schema.ts` + migrations `0018`…`0020_wave_g_payroll_ops.sql`

---

## Wave G — **SHIPPED**

| Capability | Detail |
|------------|--------|
| Pay wages | Dr 2150 Cr 1010/1020 → run status `PAID` |
| Remit statutory | Dr 2200/2210/2160 Cr bank — EPF+ETF(+PAYE) |
| EPF Form C / ETF R1 | `/api/hr/payroll-export?runId=&type=epf\|etf` |
| PAYE / APIT stub | Opt-in `payeEligible` + progressive brackets (not IRD-certified) |
| Auto e-invoice | `AUTO_EINVOICE=1` or `featureFlags.autoEinvoice` after PAID checkout |
| Pharmacy FEFO | Dispense consumes lots + `controlled_drug_logs` |
| Rental deposit GL | Activate holds 2320; return/forfeit releases |
| Email templates | `email_templates` + `sendTemplatedEmail` |
| Salon → payroll | `payroll_import_commissions` matches specialist → employee |
| POS fitment | OEM lookup widget when `autoParts` flag on |

Apply: `node scripts/apply-sql-migration.mjs drizzle/migrations/0020_wave_g_payroll_ops.sql`

---

## Still deferred

- Certified IRD gateway + live VAT return pack  
- Official IRD PAYE tables (replace stub)  
- Biometric attendance clocks  
- Multi-entity / group roll-up  
- Rental charge → AR sales invoice auto-post  

---

## Related

- [`GRABBER_GAP_REGISTER.md`](./GRABBER_GAP_REGISTER.md) — SCH-007/008  
- [`ROADMAP.md`](./ROADMAP.md)
