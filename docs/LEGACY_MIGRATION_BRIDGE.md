# Legacy Migration Bridge — Drop Plan

Temporary sync triggers in `0002_legacy_column_canonicalization.sql` bridge old Supabase column names to `src/db/schema.ts` canonical names.

**Status:** Active on all environments until R1-P2 complete.

---

## What exists today

| Trigger | Table | Purpose |
|---------|-------|---------|
| `trg_sync_purchase_order_legacy` | `purchase_orders` | `warehouse_id` ↔ `destination_warehouse_id`, `total_amount` ↔ `total_cost` |
| `trg_sync_purchase_order_line_legacy` | `purchase_order_lines` | `po_id` ↔ `purchase_order_id`, qty/cost aliases |
| `trg_sync_tax_rate_legacy` | `tax_rates` | `rate_percentage` ↔ `rate` |

Backfill `UPDATE` blocks in `0002` are guarded with `information_schema` checks so **fresh** `db:bootstrap` succeeds without legacy columns.

---

## Drop criteria (R1-P2 exit)

Before dropping triggers:

1. [ ] All production DBs migrated via `0000` → `0002` (no legacy-only columns in use)
2. [ ] `npm run db:inspect-columns` shows no writes to legacy column names in app code
3. [ ] One full `client:certify` pass on staging after trigger removal
4. [ ] New migration `0003_drop_legacy_triggers.sql` (idempotent `DROP TRIGGER IF EXISTS`)

---

## Planned `0003` (not applied yet)

```sql
DROP TRIGGER IF EXISTS trg_sync_purchase_order_legacy ON purchase_orders;
DROP TRIGGER IF EXISTS trg_sync_purchase_order_line_legacy ON purchase_order_lines;
DROP TRIGGER IF EXISTS trg_sync_tax_rate_legacy ON tax_rates;
DROP FUNCTION IF EXISTS sync_purchase_order_legacy_columns();
DROP FUNCTION IF EXISTS sync_purchase_order_line_legacy_columns();
DROP FUNCTION IF EXISTS sync_tax_rate_legacy_columns();
```

Optional column drops (separate migration after data audit):

- `purchase_orders.destination_warehouse_id`, `total_cost`
- `purchase_order_lines.purchase_order_id`, legacy qty columns
- `tax_rates.rate` (if `rate_percentage` is SSOT)

---

## Honesty rule

Do **not** mark R1 **SECURITY** 🟢 until RLS probe passes **and** this drop plan is either executed or explicitly deferred with owner sign-off.
