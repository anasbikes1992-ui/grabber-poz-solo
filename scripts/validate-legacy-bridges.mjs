#!/usr/bin/env node
/**
 * DB-06 — Non-destructive legacy bridge validator (Phase 4).
 * Asserts sync triggers/functions exist and reports legacy vs canonical columns.
 * Does NOT drop anything.
 *
 * Usage:
 *   node scripts/validate-legacy-bridges.mjs
 *   node scripts/validate-legacy-bridges.mjs --env-file .env.prod.txt
 */
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';

const envIdx = process.argv.indexOf('--env-file');
if (envIdx !== -1 && process.argv[envIdx + 1]) {
  loadEnv({ path: process.argv[envIdx + 1] });
}
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.database_url;
if (!url) {
  console.error('FAIL  DATABASE_URL missing');
  process.exit(1);
}

const EXPECTED_TRIGGERS = [
  'trg_sync_purchase_order_legacy',
  'trg_sync_purchase_order_line_legacy',
  'trg_sync_tax_rate_legacy',
];

const EXPECTED_FUNCTIONS = [
  'sync_purchase_order_legacy_columns',
  'sync_purchase_order_line_legacy_columns',
  'sync_tax_rate_legacy_columns',
];

const COLUMN_CHECKS = [
  {
    table: 'purchase_orders',
    canonical: ['warehouse_id', 'total_amount'],
    legacy: ['destination_warehouse_id', 'total_cost'],
  },
  {
    table: 'purchase_order_lines',
    canonical: ['po_id', 'ordered_qty'],
    legacy: ['purchase_order_id'],
  },
  {
    table: 'tax_rates',
    canonical: ['rate_percentage'],
    legacy: ['rate'],
  },
];

const sql = postgres(url, { max: 1, prepare: false, ssl: 'require' });

async function columnNames(table) {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
  `;
  return new Set(rows.map((r) => r.column_name));
}

async function main() {
  console.log('\nDB-06 LEGACY BRIDGE VALIDATE (read-only)\n');
  let failed = 0;

  const triggers = await sql`
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
  `;
  const triggerSet = new Set(triggers.map((t) => t.trigger_name));

  for (const name of EXPECTED_TRIGGERS) {
    const ok = triggerSet.has(name);
    console.log(`${ok ? 'PASS' : 'WARN'}  trigger ${name}`);
    if (!ok) failed += 1;
  }

  const funcs = await sql`
    SELECT routine_name
    FROM information_schema.routines
    WHERE specific_schema = 'public' AND routine_type = 'FUNCTION'
  `;
  const funcSet = new Set(funcs.map((f) => f.routine_name));

  for (const name of EXPECTED_FUNCTIONS) {
    const ok = funcSet.has(name);
    console.log(`${ok ? 'PASS' : 'WARN'}  function ${name}`);
    if (!ok) failed += 1;
  }

  for (const check of COLUMN_CHECKS) {
    const cols = await columnNames(check.table);
    for (const c of check.canonical) {
      const ok = cols.has(c);
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${check.table}.${c} (canonical)`);
      if (!ok) failed += 1;
    }
    for (const c of check.legacy) {
      const present = cols.has(c);
      console.log(`${present ? 'INFO' : 'INFO'}  ${check.table}.${c} (legacy ${present ? 'present — bridge still needed' : 'absent — fresh DB OK'})`);
    }
  }

  // Optional mismatch sample (only if both columns exist)
  try {
    const poCols = await columnNames('purchase_orders');
    if (poCols.has('warehouse_id') && poCols.has('destination_warehouse_id')) {
      const [row] = await sql`
        SELECT COUNT(*)::int AS n
        FROM purchase_orders
        WHERE warehouse_id IS DISTINCT FROM destination_warehouse_id
      `;
      console.log(`INFO  purchase_orders warehouse mismatch rows: ${row?.n ?? 0}`);
    }
  } catch (err) {
    console.log(`INFO  mismatch probe skipped: ${err instanceof Error ? err.message : String(err)}`);
  }

  const reportDir = path.resolve('reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `db06-legacy-validate-${Date.now()}.txt`);
  fs.writeFileSync(
    reportPath,
    `DB-06 validate ${new Date().toISOString()}\nfailed=${failed}\nSee docs/LEGACY_MIGRATION_BRIDGE.md\n`,
  );
  console.log(`\nWrote ${reportPath}`);

  await sql.end({ timeout: 2 });

  if (failed > 0) {
    console.log(`\nRESULT: ${failed} missing bridge object(s) — run npm run db:bootstrap / db:align before dropping.\n`);
    process.exit(1);
  }
  console.log('\nRESULT: PASS — bridges healthy (do not drop until 2 weeks stable + certify).\n');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('FAIL ', err.message || err);
  try {
    await sql.end({ timeout: 1 });
  } catch {
    /* ignore */
  }
  process.exit(1);
});
