#!/usr/bin/env node

/**
 * GRABBER BUSINESS OS — CLIENT INSTANCE CERTIFICATION ENGINE
 *
 * Aligns to src/db/schema.ts (SSOT). Does NOT claim RBAC/RLS/CDN/API coverage
 * until those gates are implemented (see docs/correction.md).
 *
 * Usage:
 *   node scripts/certify-client.mjs --dry-run
 *   node scripts/certify-client.mjs --client "Shopping Station" --slug "shoppingstation" --env .env.production
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import postgres from 'postgres';

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const isDryRun = hasFlag('--dry-run');
const customEnvPath = getArg('--env');
const clientName = getArg('--client') || process.env.NEXT_PUBLIC_STORE_NAME || 'Client Store Instance';
const rawSlug = getArg('--slug') || 'default-store';
const clientSlug = String(rawSlug).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 64) || 'default-store';
const certId = `CERT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const timestamp = new Date().toISOString();
const appVersion = process.env.npm_package_version ? `v${process.env.npm_package_version}` : 'v1.0.0';

function resolveCommitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown';
  }
}
const commitSha = resolveCommitSha();

if (customEnvPath && fs.existsSync(customEnvPath)) {
  dotenv.config({ path: path.resolve(customEnvPath) });
} else if (fs.existsSync('.env.local')) {
  dotenv.config({ path: path.resolve('.env.local') });
} else {
  dotenv.config();
}

console.log(`\n======================================================`);
console.log(`GRABBER BUSINESS OS — INSTANCE CERTIFICATION ENGINE`);
console.log(`======================================================`);
console.log(`Certification ID:    ${certId}`);
console.log(`Client Instance:     ${clientName} (${clientSlug})`);
console.log(`Application Version: ${appVersion} (Commit: ${commitSha})`);
console.log(`Target URL:          ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`);
console.log(`Mode:                ${isDryRun ? 'DRY RUN (schema/pre-flight)' : 'LIVE (synthetic SQL chains)'}`);
console.log(`Timestamp:           ${timestamp}`);
console.log(`Schema SSOT:         src/db/schema.ts (49 tables)`);
console.log(`======================================================\n`);

/** Canonical tables from src/db/schema.ts — do not invent names here */
const REQUIRED_TABLES = [
  'business_profile', 'business_config', 'users', 'branches', 'registers',
  'warehouses', 'user_assignments', 'tax_profiles', 'tax_rates', 'categories',
  'products', 'product_variants', 'stock_balances', 'stock_movements',
  'customers', 'polim_potha_accounts', 'polim_potha_entries', 'suppliers',
  'supplier_accounts', 'supplier_entries', 'shifts', 'orders', 'order_items',
  'payments', 'deliveries', 'order_returns', 'purchase_orders',
  'purchase_order_lines', 'transfers', 'transfer_lines', 'chart_of_accounts',
  'journal_entries', 'journal_lines', 'media_assets', 'creative_projects',
  'creative_chapters', 'creative_scenes', 'creative_jobs', 'audit_logs',
  'webhook_events', 'backup_records',
  'repair_jobs', 'dining_tables', 'kitchen_tickets',
  'hire_purchase_contracts', 'hire_purchase_installments',
  'appointments', 'loyalty_members', 'loyalty_transactions',
];

const UNIMPLEMENTED_GATES = [
  'Security & RBAC / RLS policy probes (not automated yet)',
  'Storage & CDN read/write smoke (not automated yet)',
];

/**
 * Optional HTTP API certification (Wave 3+).
 * Set CERTIFY_HTTP_BASE_URL (e.g. http://localhost:3000) to probe live routes.
 * When unset, HTTP checks are SKIPPED — they do not fail the SQL suite.
 */
async function runOptionalHttpCert(recordCheck) {
  const base = process.env.CERTIFY_HTTP_BASE_URL?.replace(/\/$/, '');
  if (!base) {
    console.log(`\n[OPTIONAL] HTTP API CERTIFICATION — SKIPPED (CERTIFY_HTTP_BASE_URL not set)`);
    recordCheck(
      'HTTP_API',
      'HTTP API Suite',
      'OPTIONAL',
      true,
      'SKIPPED — set CERTIFY_HTTP_BASE_URL to enable GET /api/pos/catalog + POST /api/health probes',
      false
    );
    return;
  }

  console.log(`\n[OPTIONAL] HTTP API CERTIFICATION (${base})`);

  try {
    const catalogRes = await fetch(`${base}/api/pos/catalog`, { method: 'GET' });
    const catalogOk = catalogRes.ok;
    const catalogBody = await catalogRes.json().catch(() => ({}));
    recordCheck(
      'HTTP_API',
      'GET /api/pos/catalog',
      'OPTIONAL',
      catalogOk && catalogBody.success !== false,
      catalogOk ? `HTTP ${catalogRes.status}` : `HTTP ${catalogRes.status} — catalog probe failed`,
      false
    );
    console.log(`  ${catalogOk ? '✓' : '✗'} GET /api/pos/catalog → ${catalogRes.status}`);
  } catch (err) {
    recordCheck('HTTP_API', 'GET /api/pos/catalog', 'OPTIONAL', false, err.message, false);
    console.log(`  ✗ GET /api/pos/catalog → ${err.message}`);
  }

  try {
    const healthRes = await fetch(`${base}/api/health`, { method: 'POST' });
    const healthOk = healthRes.ok;
    const healthBody = await healthRes.json().catch(() => ({}));
    recordCheck(
      'HTTP_API',
      'POST /api/health',
      'OPTIONAL',
      healthOk && healthBody.success === true,
      healthOk ? `HTTP ${healthRes.status}` : `HTTP ${healthRes.status} — health probe failed`,
      false
    );
    console.log(`  ${healthOk ? '✓' : '✗'} POST /api/health → ${healthRes.status}`);
  } catch (err) {
    recordCheck('HTTP_API', 'POST /api/health', 'OPTIONAL', false, err.message, false);
    console.log(`  ✗ POST /api/health → ${err.message}`);
  }
}

async function runCertification() {
  const results = {
    certificationId: certId,
    client: clientName,
    slug: clientSlug,
    appVersion,
    commitSha,
    schemaVersion: '49 Tables (src/db/schema.ts)',
    timestamp,
    mode: isDryRun ? 'DRY_RUN' : 'LIVE_SQL_CHAINS',
    levelAttained: 'NONE',
    p0Failures: 0,
    p1Warnings: 0,
    p2Notices: 0,
    testsTotal: 0,
    testsPassed: 0,
    testsFailed: 0,
    unimplementedGates: UNIMPLEMENTED_GATES,
    chains: {},
  };

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(`[P0] FATAL: DATABASE_URL is not defined.`);
    results.p0Failures++;
    saveReports(results);
    process.exit(1);
  }

  let sql;
  try {
    sql = postgres(dbUrl, { max: 3, connect_timeout: 10, idle_timeout: 10 });
  } catch (err) {
    console.error(`[P0] FATAL: Database client init failed:`, err.message);
    results.p0Failures++;
    saveReports(results);
    process.exit(1);
  }

  const recordCheck = (chainKey, stepName, level, passed, details, isP0 = true) => {
    results.testsTotal++;
    if (!results.chains[chainKey]) results.chains[chainKey] = { level, steps: [] };
    if (passed) {
      results.testsPassed++;
      results.chains[chainKey].steps.push({ step: stepName, status: 'PASS', details });
    } else {
      results.testsFailed++;
      if (isP0) results.p0Failures++;
      else results.p1Warnings++;
      results.chains[chainKey].steps.push({ step: stepName, status: isP0 ? 'FAIL' : 'WARN', details });
    }
  };

  let testProductId = null;
  let testCustomerId = null;
  let testSupplierId = null;
  let testBranchId = null;
  const createdOrderIds = [];
  const createdJournalIds = [];
  let eventId = null;

  try {
    console.log(`[LEVEL 1] INSTANCE & SCHEMA INTEGRITY`);
    console.log(`  Note: RBAC/RLS/CDN/API gates are NOT run yet (see unimplementedGates).`);

    const tableRows = await sql`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `;
    const existingTables = new Set(tableRows.map((r) => r.table_name));
    const missingTables = REQUIRED_TABLES.filter((t) => !existingTables.has(t));
    const schemaPassed = missingTables.length === 0;
    recordCheck(
      'L1_INSTANCE',
      'Canonical 49 Tables',
      'L1',
      schemaPassed,
      schemaPassed ? `All ${REQUIRED_TABLES.length} tables verified` : `Missing: ${missingTables.join(', ')}`
    );
    console.log(`  ${schemaPassed ? '✓' : '✗'} Schema Tables: ${existingTables.size} present / ${REQUIRED_TABLES.length} required.`);

    const [coaCount] = await sql`SELECT count(*)::int as count FROM public.chart_of_accounts`;
    const coaPassed = coaCount.count >= 5;
    recordCheck('L1_INSTANCE', 'Chart of Accounts Ledgers', 'L1', coaPassed, `${coaCount.count} ledgers active`);
    console.log(`  ${coaPassed ? '✓' : '✗'} Chart of Accounts: ${coaCount.count} ledgers.`);

    const requiredCodes = ['1010', '1200', '4000', '5000'];
    const codeRows = await sql`
      SELECT code FROM public.chart_of_accounts WHERE code IN ${sql(requiredCodes)}
    `;
    const foundCodes = new Set(codeRows.map((r) => r.code));
    const missingCodes = requiredCodes.filter((c) => !foundCodes.has(c));
    const codesPassed = missingCodes.length === 0;
    recordCheck(
      'L1_INSTANCE',
      'Standard COA Codes',
      'L1',
      codesPassed,
      codesPassed ? `Codes ${requiredCodes.join(', ')} present` : `Missing codes: ${missingCodes.join(', ')}`
    );

    const [userCount] = await sql`SELECT count(*)::int as count FROM public.users WHERE active = true`;
    const usersPassed = userCount.count > 0;
    recordCheck(
      'L1_INSTANCE',
      'Active User Accounts',
      'L1',
      usersPassed,
      usersPassed ? `${userCount.count} active user(s)` : 'No active users — provision OWNER before handover'
    );
    console.log(`  ${usersPassed ? '✓' : '✗'} Active users: ${userCount.count}`);

    const [ownerCount] = await sql`
      SELECT count(*)::int as count FROM public.users WHERE active = true AND role = 'OWNER'
    `;
    if (userCount.count > 0) {
      const ownerPassed = ownerCount.count >= 1;
      recordCheck(
        'L1_INSTANCE',
        'Owner Role Present',
        'L1',
        ownerPassed,
        ownerPassed ? `${ownerCount.count} OWNER account(s)` : 'No OWNER role user — required for handover',
        true
      );
    } else {
      results.p1Warnings++;
      recordCheck('L1_INSTANCE', 'Owner Role Present', 'L1', false, 'Skipped — no users', false);
    }

    for (const gate of UNIMPLEMENTED_GATES) {
      results.p2Notices++;
      console.log(`  ℹ Deferred: ${gate}`);
    }

    if (results.p0Failures === 0) results.levelAttained = 'L1_INSTANCE_CERTIFIED';

    if (isDryRun) {
      console.log(`\nDRY RUN COMPLETE: Schema/pre-flight only. Live SQL chains skipped.`);
      await sql.end();
      saveReports(results);
      process.exit(results.p0Failures === 0 ? 0 : 1);
    }

    if (!schemaPassed) {
      console.error(`\n[P0] Aborting live chains — schema incomplete.`);
      await sql.end();
      saveReports(results);
      process.exit(1);
    }

    const testSku = `CERT_${Date.now().toString().slice(-6)}`;
    const testSlug = `cert-${testSku.toLowerCase()}`;

    // Ensure a branch for stock location_id
    const [branch] = await sql`
      INSERT INTO public.branches (name, code)
      VALUES (${'Cert Branch ' + testSku}, ${'CERT-' + testSku})
      RETURNING id
    `;
    testBranchId = branch.id;

    console.log(`\n[CHAIN 1] POS CASH SALE + STOCK + REVENUE/COGS GL`);

    const [testProd] = await sql`
      INSERT INTO public.products (
        sku, slug, name, sale_price, cost_price, is_active,
        base_price, base_cost, active
      ) VALUES (
        ${testSku}, ${testSlug}, 'Certification High-Integrity Item',
        2000.00, 1200.00, true,
        2000.00, 1200.00, true
      ) RETURNING id
    `;
    testProductId = testProd.id;

    await sql`
      INSERT INTO public.stock_balances (
        location_type, location_id, product_id, on_hand, reserved, damaged
      ) VALUES (
        'BRANCH', ${testBranchId}, ${testProductId}, 20, 0, 0
      )
    `;

    const [order1] = await sql`
      INSERT INTO public.orders (
        order_number, channel, order_status, payment_status, fulfillment_status,
        subtotal, discount_total, tax_total, grand_total, branch_id
      ) VALUES (
        ${'ORD-CASH-' + testSku}, 'POS', 'DELIVERED', 'PAID', 'DELIVERED',
        4000.00, 0.00, 0.00, 4000.00, ${testBranchId}
      ) RETURNING id
    `;
    createdOrderIds.push(order1.id);

    await sql`
      INSERT INTO public.order_items (
        order_id, product_id, quantity, unit_price, unit_cost, tax_amount, discount_amount, line_total
      ) VALUES (
        ${order1.id}, ${testProductId}, 2, 2000.00, 1200.00, 0.00, 0.00, 4000.00
      )
    `;

    await sql`
      UPDATE public.stock_balances
      SET on_hand = on_hand - 2, updated_at = NOW()
      WHERE product_id = ${testProductId} AND location_id = ${testBranchId}
    `;

    const [jrnCash] = await sql`
      INSERT INTO public.journal_entries (
        entry_number, entry_date, description, reference_type, reference_id,
        source_type, source_id, memo
      ) VALUES (
        ${'JRN-CASH-' + testSku}, CURRENT_DATE, 'Cash Sale & COGS Recognition', 'ORDER', ${order1.id},
        'ORDER', ${order1.id}, 'Cash Sale & COGS Recognition'
      ) RETURNING id
    `;
    createdJournalIds.push(jrnCash.id);

    await sql`
      INSERT INTO public.journal_lines (journal_entry_id, account_id, account_code, debit, credit, memo)
      VALUES
      (${jrnCash.id}, (SELECT id FROM public.chart_of_accounts WHERE code = '1010' LIMIT 1), '1010', 4000.00, 0.00, 'Cash Received'),
      (${jrnCash.id}, (SELECT id FROM public.chart_of_accounts WHERE code = '4000' LIMIT 1), '4000', 0.00, 4000.00, 'Sales Revenue'),
      (${jrnCash.id}, (SELECT id FROM public.chart_of_accounts WHERE code = '5000' LIMIT 1), '5000', 2400.00, 0.00, 'COGS Expensed'),
      (${jrnCash.id}, (SELECT id FROM public.chart_of_accounts WHERE code = '1200' LIMIT 1), '1200', 0.00, 2400.00, 'Inventory Relieved')
    `;

    const [jrnCashBal] = await sql`
      SELECT SUM(debit)::numeric as debit, SUM(credit)::numeric as credit
      FROM public.journal_lines WHERE journal_entry_id = ${jrnCash.id}
    `;
    const [stock1] = await sql`
      SELECT on_hand FROM public.stock_balances
      WHERE product_id = ${testProductId} AND location_id = ${testBranchId}
    `;
    const chain1Passed =
      stock1.on_hand === 18 &&
      Number(jrnCashBal.debit) === Number(jrnCashBal.credit) &&
      Number(jrnCashBal.debit) === 6400;
    recordCheck(
      'CHAIN_1_CASH_SALE',
      'Cash Sale Reconciled (Stock 18, Debits==Credits 6400)',
      'L3',
      chain1Passed,
      `Stock: 20 -> ${stock1.on_hand}, Revenue: 4000, COGS: 2400`
    );
    console.log(`  ${chain1Passed ? '✓' : '✗'} Cash sale: stock=${stock1.on_hand}, GL balance=${jrnCashBal.debit}`);

    console.log(`\n[CHAIN 2] POLIM POTHA INVOICE + REPAYMENT`);
    const phone = `9471${Math.floor(1000000 + Math.random() * 9000000)}`;
    const [testCust] = await sql`
      INSERT INTO public.customers (name, phone, credit_limit)
      VALUES ('Cert Credit Customer', ${phone}, 10000.00)
      RETURNING id
    `;
    testCustomerId = testCust.id;

    await sql`
      INSERT INTO public.polim_potha_accounts (customer_id, credit_limit, current_balance, status)
      VALUES (${testCustomerId}, 10000.00, 0.00, 'ACTIVE')
    `;

    await sql`
      INSERT INTO public.polim_potha_entries (customer_id, type, amount, balance_after, notes)
      VALUES (${testCustomerId}, 'INVOICE', 4000.00, 4000.00, 'Credit Sale ORD-CREDIT')
    `;
    await sql`
      UPDATE public.polim_potha_accounts
      SET current_balance = current_balance + 4000.00, updated_at = NOW()
      WHERE customer_id = ${testCustomerId}
    `;

    await sql`
      INSERT INTO public.polim_potha_entries (customer_id, type, amount, balance_after, notes)
      VALUES (${testCustomerId}, 'REPAYMENT', 1500.00, 2500.00, 'Cash Repayment')
    `;
    await sql`
      UPDATE public.polim_potha_accounts
      SET current_balance = current_balance - 1500.00, updated_at = NOW()
      WHERE customer_id = ${testCustomerId}
    `;

    const [acctBal] = await sql`
      SELECT current_balance FROM public.polim_potha_accounts WHERE customer_id = ${testCustomerId}
    `;
    const chain2Passed = Number(acctBal.current_balance) === 2500.0;
    recordCheck(
      'CHAIN_2_POLIM_POTHA',
      'AR Invoice & Repayment (0 -> +4000 -> -1500 = 2500)',
      'L3',
      chain2Passed,
      `Final AR: ${acctBal.current_balance} LKR`
    );
    console.log(`  ${chain2Passed ? '✓' : '✗'} Polim Potha AR: ${acctBal.current_balance}`);

    console.log(`\n[CHAIN 3] SALES RETURN + STOCK + GL REVERSAL`);
    await sql`
      UPDATE public.stock_balances
      SET on_hand = on_hand + 1, updated_at = NOW()
      WHERE product_id = ${testProductId} AND location_id = ${testBranchId}
    `;

    const [jrnReturn] = await sql`
      INSERT INTO public.journal_entries (
        entry_number, entry_date, description, reference_type, reference_id,
        source_type, source_id, memo
      ) VALUES (
        ${'JRN-RET-' + testSku}, CURRENT_DATE, 'Sales Return 1 Unit Reversal', 'ORDER_RETURN', ${order1.id},
        'ORDER_RETURN', ${order1.id}, 'Sales Return 1 Unit Reversal'
      ) RETURNING id
    `;
    createdJournalIds.push(jrnReturn.id);

    await sql`
      INSERT INTO public.journal_lines (journal_entry_id, account_id, account_code, debit, credit, memo)
      VALUES
      (${jrnReturn.id}, (SELECT id FROM public.chart_of_accounts WHERE code = '4000' LIMIT 1), '4000', 2000.00, 0.00, 'Sales Reversal'),
      (${jrnReturn.id}, (SELECT id FROM public.chart_of_accounts WHERE code = '1010' LIMIT 1), '1010', 0.00, 2000.00, 'Cash Refunded'),
      (${jrnReturn.id}, (SELECT id FROM public.chart_of_accounts WHERE code = '1200' LIMIT 1), '1200', 1200.00, 0.00, 'Inventory Restored'),
      (${jrnReturn.id}, (SELECT id FROM public.chart_of_accounts WHERE code = '5000' LIMIT 1), '5000', 0.00, 1200.00, 'COGS Relieved')
    `;

    const [stockAfterRet] = await sql`
      SELECT on_hand FROM public.stock_balances
      WHERE product_id = ${testProductId} AND location_id = ${testBranchId}
    `;
    const [retBal] = await sql`
      SELECT SUM(debit)::numeric as debit, SUM(credit)::numeric as credit
      FROM public.journal_lines WHERE journal_entry_id = ${jrnReturn.id}
    `;
    const chain3Passed =
      stockAfterRet.on_hand === 19 &&
      Number(retBal.debit) === Number(retBal.credit) &&
      Number(retBal.debit) === 3200;
    recordCheck(
      'CHAIN_3_RETURN_REVERSAL',
      'Return Reversal (Stock 19, GL 3200 balanced)',
      'L3',
      chain3Passed,
      `Stock: ${stockAfterRet.on_hand}, Debits==Credits: ${retBal.debit}`
    );
    console.log(`  ${chain3Passed ? '✓' : '✗'} Return: stock=${stockAfterRet.on_hand}`);

    console.log(`\n[CHAIN 4] SUPPLIER AP + STOCK INTAKE`);
    const [testSupp] = await sql`
      INSERT INTO public.suppliers (name, phone)
      VALUES ('Cert Supplier Lanka', '94112345678')
      RETURNING id
    `;
    testSupplierId = testSupp.id;

    await sql`
      INSERT INTO public.supplier_accounts (supplier_id, current_balance, credit_terms_days)
      VALUES (${testSupplierId}, 0.00, 30)
    `;

    await sql`
      UPDATE public.stock_balances
      SET on_hand = on_hand + 10, updated_at = NOW()
      WHERE product_id = ${testProductId} AND location_id = ${testBranchId}
    `;

    await sql`
      INSERT INTO public.supplier_entries (supplier_id, type, amount, balance_after, reference_no)
      VALUES (${testSupplierId}, 'BILL', 10000.00, 10000.00, ${'BILL-' + testSku})
    `;
    await sql`
      UPDATE public.supplier_accounts
      SET current_balance = current_balance + 10000.00, updated_at = NOW()
      WHERE supplier_id = ${testSupplierId}
    `;

    const [stockAfterGrn] = await sql`
      SELECT on_hand FROM public.stock_balances
      WHERE product_id = ${testProductId} AND location_id = ${testBranchId}
    `;
    const [suppBal] = await sql`
      SELECT current_balance FROM public.supplier_accounts WHERE supplier_id = ${testSupplierId}
    `;
    const chain4Passed = stockAfterGrn.on_hand === 29 && Number(suppBal.current_balance) === 10000.0;
    recordCheck(
      'CHAIN_4_PURCHASING',
      'Stock intake + Supplier AP (Stock 29, AP 10000)',
      'L3',
      chain4Passed,
      `Stock on hand: ${stockAfterGrn.on_hand}, AP: ${suppBal.current_balance}`
    );
    console.log(`  ${chain4Passed ? '✓' : '✗'} Purchasing: stock=${stockAfterGrn.on_hand}, AP=${suppBal.current_balance}`);

    if (results.p0Failures === 0) results.levelAttained = 'L3_FINANCIAL_CERTIFIED';

    console.log(`\n[LEVEL 4] IDEMPOTENCY & ZERO-RESIDUE CLEANUP`);

    eventId = `EVT_${testSku}`;
    await sql`
      INSERT INTO public.webhook_events (provider, provider_event_id, event_type, payload, status, processed)
      VALUES ('payhere', ${eventId}, 'PAYMENT_SUCCESS', ${sql.json({ status: 'success' })}, 'PROCESSED', true)
    `;

    let duplicateCaught = false;
    try {
      await sql`
        INSERT INTO public.webhook_events (provider, provider_event_id, event_type, payload, status, processed)
        VALUES ('payhere', ${eventId}, 'PAYMENT_SUCCESS', ${sql.json({ status: 'success' })}, 'PROCESSED', true)
      `;
    } catch {
      duplicateCaught = true;
    }
    recordCheck(
      'L4_RESILIENCE',
      'Webhook Idempotency Unique Constraint',
      'L4',
      duplicateCaught,
      `Duplicate event ${eventId} blocked`
    );
    console.log(`  ${duplicateCaught ? '✓' : '✗'} Idempotency guard`);

    // Cleanup (best-effort ordered deletes)
    await sql`DELETE FROM public.webhook_events WHERE provider_event_id = ${eventId}`;
    if (createdJournalIds.length) {
      await sql`DELETE FROM public.journal_lines WHERE journal_entry_id IN ${sql(createdJournalIds)}`;
      await sql`DELETE FROM public.journal_entries WHERE id IN ${sql(createdJournalIds)}`;
    }
    if (createdOrderIds.length) {
      await sql`DELETE FROM public.order_items WHERE order_id IN ${sql(createdOrderIds)}`;
      await sql`DELETE FROM public.orders WHERE id IN ${sql(createdOrderIds)}`;
    }
    if (testCustomerId) {
      await sql`DELETE FROM public.polim_potha_entries WHERE customer_id = ${testCustomerId}`;
      await sql`DELETE FROM public.polim_potha_accounts WHERE customer_id = ${testCustomerId}`;
      await sql`DELETE FROM public.customers WHERE id = ${testCustomerId}`;
    }
    if (testSupplierId) {
      await sql`DELETE FROM public.supplier_entries WHERE supplier_id = ${testSupplierId}`;
      await sql`DELETE FROM public.supplier_accounts WHERE supplier_id = ${testSupplierId}`;
      await sql`DELETE FROM public.suppliers WHERE id = ${testSupplierId}`;
    }
    if (testProductId) {
      await sql`DELETE FROM public.stock_balances WHERE product_id = ${testProductId}`;
      await sql`DELETE FROM public.products WHERE id = ${testProductId}`;
    }
    if (testBranchId) {
      await sql`DELETE FROM public.branches WHERE id = ${testBranchId}`;
    }

    const [resProd] = await sql`SELECT count(*)::int as count FROM public.products WHERE sku = ${testSku}`;
    const [resCust] = await sql`
      SELECT count(*)::int as count FROM public.customers WHERE id = ${testCustomerId ?? '00000000-0000-0000-0000-000000000000'}
    `;
    const cleanupPassed = resProd.count === 0 && resCust.count === 0;
    recordCheck('L4_RESILIENCE', 'Zero-Residue Verified Cleanup', 'L4', cleanupPassed, `Residual synthetic records = 0`);
    console.log(`  ${cleanupPassed ? '✓' : '✗'} Zero-residue cleanup`);

    if (results.p0Failures === 0) results.levelAttained = 'L4_SCHEMA_SQL_CERTIFIED';

    await runOptionalHttpCert(recordCheck);

  } catch (err) {
    console.error(`\n[P0] UNHANDLED EXCEPTION:`, err.message);
    results.p0Failures++;
    results.testsFailed++;
    // Best-effort emergency cleanup
    try {
      if (eventId) await sql`DELETE FROM public.webhook_events WHERE provider_event_id = ${eventId}`;
      if (createdJournalIds.length) {
        await sql`DELETE FROM public.journal_lines WHERE journal_entry_id IN ${sql(createdJournalIds)}`;
        await sql`DELETE FROM public.journal_entries WHERE id IN ${sql(createdJournalIds)}`;
      }
      if (createdOrderIds.length) {
        await sql`DELETE FROM public.order_items WHERE order_id IN ${sql(createdOrderIds)}`;
        await sql`DELETE FROM public.orders WHERE id IN ${sql(createdOrderIds)}`;
      }
      if (testCustomerId) {
        await sql`DELETE FROM public.polim_potha_entries WHERE customer_id = ${testCustomerId}`;
        await sql`DELETE FROM public.polim_potha_accounts WHERE customer_id = ${testCustomerId}`;
        await sql`DELETE FROM public.customers WHERE id = ${testCustomerId}`;
      }
      if (testSupplierId) {
        await sql`DELETE FROM public.supplier_entries WHERE supplier_id = ${testSupplierId}`;
        await sql`DELETE FROM public.supplier_accounts WHERE supplier_id = ${testSupplierId}`;
        await sql`DELETE FROM public.suppliers WHERE id = ${testSupplierId}`;
      }
      if (testProductId) {
        await sql`DELETE FROM public.stock_balances WHERE product_id = ${testProductId}`;
        await sql`DELETE FROM public.products WHERE id = ${testProductId}`;
      }
      if (testBranchId) await sql`DELETE FROM public.branches WHERE id = ${testBranchId}`;
    } catch {
      /* ignore cleanup errors */
    }
  } finally {
    await sql.end();
  }

  const isApproved = results.p0Failures === 0;
  console.log(`\n======================================================`);
  console.log(`GRABBER INSTANCE CERTIFICATION VERDICT`);
  console.log(`======================================================`);
  console.log(`Certification ID:    ${results.certificationId}`);
  console.log(`Client Instance:     ${results.client}`);
  console.log(`App / Commit:        ${results.appVersion} (${results.commitSha})`);
  console.log(`Level Attained:      ${results.levelAttained}`);
  console.log(`Total Checks:        ${results.testsTotal}`);
  console.log(`Passed / Failed:     ${results.testsPassed} / ${results.testsFailed}`);
  console.log(`P0 Blocking Errors:  ${results.p0Failures}`);
  console.log(`Deferred gates:      ${UNIMPLEMENTED_GATES.length} (RBAC/CDN/API)`);
  console.log(
    `Handover Verdict:    ${
      isApproved
        ? 'SCHEMA/SQL GATES PASSED — full production handover still requires Wave 1–2 (docs/correction.md)'
        : 'HANDOVER BLOCKED'
    }`
  );
  console.log(`======================================================\n`);

  saveReports(results);
  process.exit(isApproved ? 0 : 1);
}

function saveReports(results) {
  const reportsDir = path.resolve('reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const jsonPath = path.join(reportsDir, `client_certification_${results.slug}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  const mdPath = path.join(reportsDir, `CLIENT_CERTIFICATION_${results.slug.toUpperCase()}.md`);
  const deferred = (results.unimplementedGates || [])
    .map((g) => `- ⏳ ${g}`)
    .join('\n');

  const mdContent = `# GRABBER BUSINESS OS — INSTANCE CERTIFICATION REPORT

* **Certification ID:** \`${results.certificationId}\`
* **Client Store:** **${results.client}**
* **Instance Slug:** \`${results.slug}\`
* **Application Version:** \`${results.appVersion}\`
* **Commit SHA:** \`${results.commitSha}\`
* **Schema Version:** \`${results.schemaVersion}\`
* **Certified At:** ${results.timestamp}
* **Mode:** \`${results.mode}\`
* **Certification Level:** **${results.levelAttained}**
* **Final Verdict:** **${results.p0Failures === 0 ? '✅ SCHEMA/SQL GATES PASSED' : '❌ HANDOVER SUSPENDED'}**

> **Honesty notice:** Passing this report proves PostgreSQL schema + synthetic SQL invariant chains.
> It does **not** prove app API durability, RBAC/RLS, storage CDN, or UI wiring.
> See \`docs/correction.md\` for remaining Wave 1–2 blockers before production handover.

---

## 1. Executive Quality Scorecard

| Metric | Result | Target | Gate Status |
| :--- | :--- | :--- | :--- |
| **P0 Critical Failures** | **${results.p0Failures}** | 0 | ${results.p0Failures === 0 ? 'PASSED' : 'FAILED'} |
| **Total Checks** | **${results.testsTotal}** | > 0 | ${results.testsTotal > 0 ? 'COMPLETE' : 'INCOMPLETE'} |
| **Pass Rate** | **${results.testsTotal > 0 ? Math.round((results.testsPassed / results.testsTotal) * 100) : 0}%** | 100% | ${results.testsPassed === results.testsTotal ? '100%' : 'SUB-OPTIMAL'} |

---

## 2. Deferred / Unimplemented Gates

${deferred || '_None listed_'}

---

## 3. Invariant Chains

${Object.entries(results.chains)
  .map(
    ([chainName, c]) => `
### ${chainName} (${c.level})
| Step / Assertion | Status | Details |
| :--- | :--- | :--- |
${c.steps.map((s) => `| ${s.step} | ${s.status === 'PASS' ? 'PASS' : s.status} | ${s.details} |`).join('\n')}
`
  )
  .join('\n')}

---

## 4. Sign-Off

* **Audit Authority:** GRABBER Certification Engine (${results.appVersion} • \`${results.commitSha}\`)
* **Next required:** Wave 1 durable commerce + Wave 2 auth/RLS (\`docs/correction.md\`)
`;

  fs.writeFileSync(mdPath, mdContent);
}

runCertification();
