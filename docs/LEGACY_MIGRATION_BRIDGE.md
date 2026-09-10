# Legacy Migration Bridge — Drop Plan (DB-06)

Temporary sync triggers in `0002_legacy_column_canonicalization.sql` bridge old Supabase column names to `src/db/schema.ts` canonical names.

**Status:** Active on upgraded environments until Phase 4 exit. Fresh `db:bootstrap` may lack legacy columns (INFO-only).

**Validate (non-destructive):** `npm run db:validate-legacy -- --env-file .env.prod.txt`

---

## What exists today

| Trigger | Table | Purpose |
|---------|-------|---------|
| `trg_sync_purchase_order_legacy` | `purchase_orders` | `warehouse_id` ↔ `destination_warehouse_id`, `total_amount` ↔ `total_cost` |
| `trg_sync_purchase_order_line_legacy` | `purchase_order_lines` | `po_id` ↔ `purchase_order_id`, qty/cost aliases |
| `trg_sync_tax_rate_legacy` | `tax_rates` | `rate_percentage` ↔ `rate` |

Backfill `UPDATE` blocks in `0002` are guarded with `information_schema` checks so **fresh** `db:bootstrap` succeeds without legacy columns.

App TS uses **canonical** names only (`warehouse_id`, `total_amount`, `po_id`, `ordered_qty`, `rate_percentage`).

---

## Drop criteria (Phase 4 / R1-P2 exit)

Before applying `drizzle/migrations/0013_drop_legacy_triggers.sql.pending` (rename to `.sql` when ready):

1. [ ] `npm run db:validate-legacy` PASS for **≥ 2 weeks** on prod
2. [ ] `npm run db:inspect-columns` — no app writes to legacy names
3. [ ] Staging: temporarily disable triggers → `npm run client:certify` PASS
4. [ ] Owner sign-off in client folder
5. [ ] Apply `0013_drop_legacy_triggers.sql` (idempotent `DROP TRIGGER IF EXISTS`)

**Do not** use migration id `0003` — that file is `0003_pass2_returns_damages.sql`.

---

## Planned `0013` (pending file in repo)

```sql
DROP TRIGGER IF EXISTS trg_sync_purchase_order_legacy ON purchase_orders;
DROP TRIGGER IF EXISTS trg_sync_purchase_order_line_legacy ON purchase_order_lines;
DROP TRIGGER IF EXISTS trg_sync_tax_rate_legacy ON tax_rates;
DROP FUNCTION IF EXISTS sync_purchase_order_legacy_columns();
DROP FUNCTION IF EXISTS sync_purchase_order_line_legacy_columns();
DROP FUNCTION IF EXISTS sync_tax_rate_legacy_columns();
```

Optional column drops (separate migration after fleet audit):

- `purchase_orders.destination_warehouse_id`, `total_cost`
- `purchase_order_lines.purchase_order_id`, legacy qty columns
- `tax_rates.rate` (if `rate_percentage` is SSOT)

---

## Honesty rule

Do **not** mark R1 **SECURITY** 🟢 until RLS probe passes **and** this drop plan is either executed or explicitly deferred with owner sign-off.
