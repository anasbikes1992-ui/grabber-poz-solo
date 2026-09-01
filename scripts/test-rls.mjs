/**
 * Verify RLS baseline is applied on the host database.
 * Exit 0 = pass, 1 = fail (or skip if no DATABASE_URL).
 */
import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const url = process.env.DATABASE_URL || process.env.database_url;
if (!url) {
  console.log('SKIP: DATABASE_URL not set');
  process.exit(0);
}

const RLS_TABLES = [
  'orders',
  'order_items',
  'payments',
  'stock_balances',
  'customers',
  'polim_potha_accounts',
  'users',
  'audit_logs',
];

const REQUIRED_POLICIES = ['staff_read_orders', 'staff_read_products'];

const db = postgres(url, { max: 1, prepare: false, ssl: 'require' });

let fail = 0;

for (const table of RLS_TABLES) {
  const [row] = await db`
    SELECT c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = ${table}
  `;
  if (!row) {
    console.log('FAIL: table missing', table);
    fail++;
    continue;
  }
  if (!row.rls_enabled) {
    console.log('FAIL: RLS not enabled on', table);
    fail++;
  } else {
    console.log('OK: RLS enabled on', table);
  }
}

for (const pol of REQUIRED_POLICIES) {
  const rows = await db`
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND policyname = ${pol}
  `;
  if (!rows.length) {
    console.log('FAIL: policy missing', pol);
    fail++;
  } else {
    console.log('OK: policy', pol);
  }
}

const anonPrivs = await db`
  SELECT privilege_type, table_name
  FROM information_schema.table_privileges
  WHERE grantee = 'anon' AND table_schema = 'public'
    AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  LIMIT 5
`;
if (anonPrivs.length) {
  console.log('WARN: anon has write privileges on', anonPrivs.map((r) => r.table_name).join(', '));
} else {
  console.log('OK: anon has no DML privileges on public tables');
}

console.log(fail ? `\nRLS probe: ${fail} failure(s)` : '\nRLS probe: PASS');
await db.end({ timeout: 2 });
process.exit(fail > 0 ? 1 : 0);
