#!/usr/bin/env node
/**
 * Nightly reset for the public demo tenant's 7 role accounts back to their
 * known, stable PINs — so a prospect trying the live demo always has a
 * working, predictable login, and anything a previous visitor changed during
 * the day is undone at midnight.
 *
 * DEMO ONLY. These PINs are intentionally public (shared with prospects) —
 * never point this script at a real merchant tenant's database. Scoped to
 * an explicit email allowlist; never touches any other account.
 *
 * Sets a real `scrypt$` hash (not `TEMP$`) so login does NOT force a PIN
 * rotation — the whole point is a stable PIN usable all day.
 *
 * Run via Coolify Scheduled Task on the demo app, `0 0 * * *`:
 *   node scripts/reset-demo-pins.mjs
 */
import { randomBytes, scryptSync } from 'crypto';
import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';
import { postgresClientOptions, resolveDatabaseUrl } from './lib/resolve-db-url.mjs';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

// Mirrors hashPin() in src/lib/auth/session.ts — keep in sync.
function hashPin(pin) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

const DEMO_ACCOUNTS = [
  ['owner@grabberpoz.com', '874508'],
  ['admin@grabberpoz.com', '647262'],
  ['manager@grabberpoz.com', '713955'],
  ['cashier@grabberpoz.com', '220797'],
  ['warehouse@grabberpoz.com', '374496'],
  ['accountant@grabberpoz.com', '607729'],
  ['marketing@grabberpoz.com', '938039'],
];

const url = resolveDatabaseUrl();
if (!url) {
  console.error('Database URL missing — set DATABASE_URL or POSTGRES_URL.');
  process.exit(1);
}

const sql = postgres(url, postgresClientOptions(url));
try {
  let resetCount = 0;
  for (const [email, pin] of DEMO_ACCOUNTS) {
    const hashed = hashPin(pin);
    const [row] = await sql`
      update users set hashed_pin = ${hashed}, active = true, updated_at = now()
      where email = ${email}
      returning email
    `;
    if (row) {
      resetCount += 1;
    } else {
      console.warn(`Skipped: no account found for ${email} (expected all 7 to exist).`);
    }
  }
  console.log(`Demo PIN reset complete: ${resetCount}/${DEMO_ACCOUNTS.length} accounts reset.`);
  process.exitCode = resetCount === DEMO_ACCOUNTS.length ? 0 : 1;
} catch (e) {
  console.error(`Failed: ${e.message || e}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
