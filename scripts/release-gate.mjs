#!/usr/bin/env node
/**
 * Release gate runner — R1 foundation checks + optional HTTP certify.
 *
 * Usage:
 *   node scripts/release-gate.mjs r1
 *   node scripts/release-gate.mjs r1 --http
 *   node scripts/release-gate.mjs all
 */
import { spawnSync } from 'child_process';
import { config as loadEnv } from 'dotenv';
import { hasDatabaseUrl } from './lib/resolve-db-url.mjs';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const args = new Set(process.argv.slice(2));
const target = process.argv[2] === 'r1' || process.argv[2] === 'all' ? process.argv[2] : 'r1';
const withHttp = args.has('--http');

function run(label, cmd, cmdArgs = [], optional = false) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(cmd, cmdArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (r.status !== 0) {
    if (optional) {
      console.warn(`⚠ Skipped/failed (optional): ${label}`);
      return false;
    }
    console.error(`✗ Failed: ${label}`);
    process.exit(r.status ?? 1);
  }
  return true;
}

console.log(`\nRELEASE GATE — ${target.toUpperCase()}\n`);

if (target === 'r1' || target === 'all') {
  run('env:validate', 'npm', ['run', 'env:validate']);

  if (hasDatabaseUrl()) {
    run('db:test-rls', 'npm', ['run', 'db:test-rls']);
  } else {
    console.log('\n⚠ DATABASE_URL not set — skipping db:test-rls (set URL to certify RLS on host)');
  }

  run('typecheck', 'npm', ['run', 'typecheck']);
  run('unit tests', 'npm', ['test']);

  if (withHttp && process.env.CERTIFY_HTTP_BASE_URL) {
    run('client:certify:http', 'npm', ['run', 'client:certify:http']);
  } else if (withHttp) {
    console.log('\n⚠ Set CERTIFY_HTTP_BASE_URL to run HTTP certification');
  }

  console.log('\n✓ R1 gate checks passed (code + RLS probe when DATABASE_URL set).');
  console.log('  Manual: npm run db:bootstrap -- --rls --certify on fresh Supabase');
  console.log('  Manual: POST /api/seed then operator retest (READY_FOR_RETESTING.md)');
}

if (target === 'all') {
  console.log('\n— R2–R5: see docs/RELEASE_GATE.md exit criteria and READY_FOR_RETESTING.md —');
}

console.log('');
