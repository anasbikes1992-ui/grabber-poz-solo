# GRABBER BUSINESS OS — RLS & AUTHORIZATION SPECIFICATION
**Single-Business Role, Location & Register Access Isolation**

---

## 1. Authorization Philosophy

* **No Multi-Tenancy Overhead:** There is only one business and one database instance. We strip out `organization_id`, `tenant_id`, and tenant switching.
* **RLS Protects Users and Roles from Each Other:** PostgreSQL Row Level Security (RLS) policies and service-level checks enforce strict least-privilege isolation based on staff **Roles** and assigned **Location Scopes** (`user_assignments`).

```
                              ONE BUSINESS (Singleton)
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 │                       │                       │
               USERS                  BRANCHES              WAREHOUSES
                 │                       │                       │
                 └───────────────┬───────┴───────────────────────┘
                                 │
                          USER_ASSIGNMENTS
                                 │
                   ┌─────────────┴─────────────┐
                   │                           │
              ROLE SCOPE                LOCATION SCOPE
         (What can they do?)        (Where can they do it?)
```

---

## 2. Role Permission & Location Isolation Matrix

| Role | Catalog / Pricing | POS / Sales | Stock / Inventory | Polim Potha (AR) | Financials & AP | Creative & Campaigns | Location Enforcement |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Owner** | Full CRUD + Cost | All channels + Override | All locations + Audit | Full control | Full P&L / Balances | Full access | Unrestricted |
| **Admin** | Full CRUD | Operational view | All locations | Read / Write | Config & Taxes | Full access | Unrestricted |
| **Manager** | Read (Cost hidden) | Assigned Branch POS + Void approval | Assigned Branch / Warehouse transfers | Credit approval override | Branch sales reports | Campaign viewer | Assigned Branch/Warehouse only |
| **Cashier** | Read (Cost hidden) | Assigned Register sales & active shift only | Assigned branch on-hand view | View limit / Standard credit sale | None | None | Assigned Register only |
| **Warehouse** | Read (Cost hidden) | None | Assigned Warehouse GRN, Bin, Transfer, Count | None | None | None | Assigned Warehouse only |
| **Accountant** | Read + Cost | Order & payment audit | Valuation reports | Ledger reconcile, Aging reports | Full General Ledger & AP | None | Unrestricted financial view |
| **Marketing** | Read (Cost hidden) | Promotion creation | Stock availability view | None | None | Full Studio & Campaigns | Unrestricted creative view |

---

## 3. Core PostgreSQL RLS Policies (Illustrative Examples)

```sql
-- Enable RLS on all operational tables
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE polim_potha_entries ENABLE ROW LEVEL SECURITY;

-- 1. Shifts: Cashiers can only access their own active register shifts
CREATE POLICY cashier_shift_isolation ON shifts
FOR ALL TO authenticated_staff
USING (
  current_role() IN ('OWNER', 'ADMIN', 'MANAGER')
  OR cashier_id = current_user_id()
);

-- 2. Stock Balances: Staff can only query locations assigned to them (unless Owner/Admin/Accountant)
CREATE POLICY location_stock_isolation ON stock_balances
FOR SELECT TO authenticated_staff
USING (
  current_role() IN ('OWNER', 'ADMIN', 'ACCOUNTANT')
  OR location_id IN (SELECT branch_id FROM user_assignments WHERE user_id = current_user_id())
  OR location_id IN (SELECT warehouse_id FROM user_assignments WHERE user_id = current_user_id())
);

-- 3. Polim Potha Credit: Cashiers can view balance, only Managers/Owners/Accountants can write adjustments
CREATE POLICY credit_ledger_write_protection ON polim_potha_entries
FOR INSERT TO authenticated_staff
WITH CHECK (
  current_role() IN ('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  OR (current_role() = 'CASHIER' AND type = 'INVOICE')
);
```
