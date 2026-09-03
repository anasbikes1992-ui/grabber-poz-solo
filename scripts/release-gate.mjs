#!/usr/bin/env node
/**
 * Release gate runner — R1–R7 checks with optional HTTP certify.
 *
 * Usage:
 *   node scripts/release-gate.mjs r1
 *   node scripts/release-gate.mjs all --env-file .env.prod.txt --production
 *   node scripts/release-gate.mjs all --env-file .env.prod.txt --production --http
 */
import { spawnSync } from 'child_process';
import { config as loadEnv } from 'dotenv';
import fs from 'fs';
import { hasDatabaseUrl } from './lib/resolve-db-url.mjs';

const argv = process.argv.slice(2);
const args = new Set(argv);
const envFileIdx = argv.indexOf('--env-file');
const envFile = envFileIdx !== -1 && argv[envFileIdx + 1] ? argv[envFileIdx + 1] : null;
const isProduction = args.has('--production') || (envFile && /prod/i.test(envFile));

if (envFile && fs.existsSync(envFile)) {
  loadEnv({ path: envFile, override: true });
} else {
  loadEnv({ path: '.env.local' });
  loadEnv({ path: '.env' });
}

const targetArg = argv.find((a) => /^r[1-7]$|^all$/i.test(a));
const target = (targetArg || 'r1').toLowerCase();
const withHttp = args.has('--http');
const baseUrl = (
  process.env.CERTIFY_HTTP_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://grabber-poz-solo.vercel.app'
).replace(/\/$/, '');

const results = [];

function run(label, cmd, cmdArgs = [], { optional = false, gate = target } = {}) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(cmd, cmdArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  const ok = r.status === 0;
  results.push({ gate, label, ok, optional });
  if (!ok) {
    if (optional) {
      console.warn(`⚠ Skipped/failed (optional): ${label}`);
      return false;
    }
    console.error(`✗ Failed: ${label}`);
    process.exit(r.status ?? 1);
  }
  return true;
}

function envValidateArgs() {
  const a = ['run', 'env:validate'];
  if (envFile) a.push('--', '--env-file', envFile);
  if (isProduction) a.push('--production');
  return a;
}

function printSummary() {
  console.log('\n======================================================');
  console.log('RELEASE GATE SUMMARY');
  console.log('======================================================');
  for (const r of results) {
    const icon = r.ok ? '✓' : r.optional ? '⚠' : '✗';
    console.log(`${icon} [${r.gate.toUpperCase()}] ${r.label}`);
  }
  console.log('======================================================\n');
}

console.log(`\nRELEASE GATE — ${target.toUpperCase()}`);
if (envFile) console.log(`Env file: ${envFile}`);
console.log('');

const runR1 = target === 'r1' || target === 'all';
const runR2 = target === 'r2' || target === 'all';
const runR3 = target === 'r3' || target === 'all';
const runR4 = target === 'r4' || target === 'all';
const runR5 = target === 'r5' || target === 'all';

if (runR1) {
  console.log('— R1 Solo Foundation —');
  run('env:validate', 'npm', envValidateArgs(), { gate: 'r1' });
  run('auth:coverage', 'npm', ['run', 'auth:coverage'], { gate: 'r1' });

  if (hasDatabaseUrl()) {
    run('db:test-rls', 'npm', ['run', 'db:test-rls'], { gate: 'r1' });
  } else {
    console.log('\n⚠ DATABASE_URL not set — skipping db:test-rls');
    results.push({ gate: 'r1', label: 'db:test-rls', ok: false, optional: true });
  }

  run('typecheck', 'npm', ['run', 'typecheck'], { gate: 'r1' });
  run('unit tests', 'npm', ['test'], { gate: 'r1' });
  run('security auth HTTP unit', 'npm', ['test', '--', 'tests/security-p0.test.ts', 'tests/security-http-auth.test.ts'], {
    gate: 'r1',
  });

  if (withHttp) {
    if (process.env.CERTIFY_HTTP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL) {
      run('client:certify:http', 'npm', ['run', 'client:certify:http'], { gate: 'r1' });
      run('client:certify:auth', 'npm', ['run', 'client:certify:auth'], { gate: 'r1' });
    } else {
      console.log('\n⚠ Set CERTIFY_HTTP_BASE_URL or NEXT_PUBLIC_APP_URL for HTTP cert');
      results.push({ gate: 'r1', label: 'client:certify:http', ok: false, optional: true });
    }
  }

  console.log('\nR1 manual: npm run db:bootstrap -- --rls --certify on fresh Supabase');
  console.log('R1 manual: POST /api/seed · rotate owner PIN · LEGACY_MIGRATION_BRIDGE.md');
}

if (runR2) {
  console.log('\n— R2 Commerce Complete —');
  run('commerce golden tests', 'npm', ['test', '--', 'tests/golden-business.test.ts', 'tests/commerce-s3.test.ts', 'tests/commerce-s4.test.ts', 'tests/release-gate.test.ts'], {
    gate: 'r2',
  });
  console.log('\nR2 open (optional): stock reservation API for async COD hold');
  console.log('R2 manual: POS sale + return + GRN smoke (READY_FOR_RETESTING RT-M04–M06)');
}

if (runR3) {
  console.log('\n— R3 Storefront —');
  run('storefront tests', 'npm', ['test', '--', 'tests/commerce-s5.test.ts', 'tests/commerce-s6.test.ts', 'tests/a11y-smoke.test.ts'], {
    gate: 'r3',
  });
  if (withHttp) {
    run('HTTP storefront smoke', 'npm', ['run', 'client:certify:http'], { gate: 'r3', optional: !process.env.CERTIFY_HTTP_BASE_URL });
  } else {
    console.log('\n⚠ Add --http to verify live storefront routes');
  }
  console.log('\nR3 open: mobile Lighthouse ≥ 80 on product + checkout (manual)');
}

if (runR4) {
  console.log('\n— R4 Communication —');
  run('WhatsApp + repair automation tests', 'npm', ['test', '--', 'tests/whatsapp-integration.test.ts', 'tests/repairs-integration.test.ts'], { gate: 'r4' });
  const waToken = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  const waPhone = process.env.WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (waToken && waPhone) {
    console.log('✓ WhatsApp credentials present in env');
    results.push({ gate: 'r4', label: 'WhatsApp env configured', ok: true });
  } else {
    console.log('⚠ WhatsApp credentials missing — live send will stub');
    results.push({ gate: 'r4', label: 'WhatsApp env configured', ok: false, optional: true });
  }
  console.log('\nR4 manual: Meta webhook verify · COD order with phone → automationLogs SUCCESS');
}

if (runR5) {
  console.log('\n— R5 Jarvis —');
  run('Jarvis / metrics tests', 'npm', ['test', '--', 'tests/release-gate.test.ts', 'tests/commerce-s7.test.ts'], { gate: 'r5' });
  console.log('\nR5 open: live HTTP parity get_sales_summary vs /api/dashboard/stats (staff session)');
  console.log('R5 deferred: full EXECUTE audit trail → R6');
}

if (target === 'r6' || target === 'all') {
  console.log('\n— R6 Agents —');
  run('agent registry + vertical tests', 'npm', ['test', '--', 'tests/agents-vertical.test.ts', 'tests/repairs-integration.test.ts'], {
    gate: 'r6',
  });
  console.log('  Manual: /ai/agents → Run all enabled agents · /api/agents/brief');
}

if (target === 'r7' || target === 'all') {
  console.log('\n— R7 Creative —');
  console.log('  Manual: /creative → generate brief · approve to storefront block');
  console.log('  Optional: FAL_KEY / REPLICATE_API_TOKEN for live media');
}

if (target === 'all') {
  printSummary();
  console.log('Full matrix: docs/RELEASE_GATE.md');
} else {
  console.log(`\n✓ ${target.toUpperCase()} automated checks complete.`);
  console.log('  Run: npm run release:gate -- --env-file .env.prod.txt --production --http');
}

console.log('');
