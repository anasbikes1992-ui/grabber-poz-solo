#!/usr/bin/env node
/**
 * Staff credential bootstrap for a tenant database — the out-of-band path.
 *
 * Why this exists: in production every HTTP route that can create a user
 * (/api/seed, /api/installation/bootstrap, /api/onboarding, /api/settings/staff)
 * requires an existing staff session, so a brand-new tenant database has no
 * way to get its first OWNER over HTTP. Run this inside the tenant container
 * (DATABASE_URL already set) instead:
 *
 *   node scripts/staff-credentials.mjs create-owner --email owner@shop.lk --name "Shop Owner"
 *   node scripts/staff-credentials.mjs rotate-weak-pins
 *
 * Both commands store the new PIN as `TEMP$<pin>` — the same temporary-
 * credential format /api/settings/staff uses — so `isTemporaryCredential` in
 * src/lib/auth/session.ts forces a rotation on first login. PINs are printed
 * once and never stored anywhere else.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';
import { postgresClientOptions, resolveDatabaseUrl } from './lib/resolve-db-url.mjs';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

// PINs treated as compromised: the historical seed default plus trivial variants.
const WEAK_PINS = ['1234', '0000', '1111', '123456', '000000', '111111'];

/** Same method as generateRandomPin() in src/lib/auth/session.ts. */
function generateRandomPin() {
  const n = randomBytes(4).readUInt32BE(0) % 900000;
  return String(100000 + n);
}

/** Mirrors verifyPin() in src/lib/auth/session.ts (TEMP$, scrypt$, legacy plaintext). */
function pinMatches(pin, stored) {
  if (!stored) return false;
  if (stored.startsWith('TEMP$')) return pin === stored.slice(5);
  if (!stored.startsWith('scrypt$')) return pin === stored;
  const [, salt, hash] = stored.split('$');
  if (!salt || !hash) return false;
  const candidate = scryptSync(pin, salt, 32).toString('hex');
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
  } catch {
    return false;
  }
}

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

function usage(code = 1) {
  console.error(
    'Usage:\n' +
      '  node scripts/staff-credentials.mjs create-owner --email <email> --name <name>\n' +
      '  node scripts/staff-credentials.mjs rotate-weak-pins',
  );
  process.exit(code);
}

async function createOwner(sql) {
  const email = arg('--email')?.trim().toLowerCase();
  const name = arg('--name')?.trim();
  if (!email || !name) usage();

  const [existingOwner] = await sql`select email from users where role = 'OWNER' limit 1`;
  if (existingOwner) {
    console.error(
      `Refusing: an OWNER already exists (${existingOwner.email}). Log in as that owner and add staff ` +
        'via /settings/staff, or use rotate-weak-pins if its PIN is unknown-but-weak.',
    );
    process.exit(2);
  }
  const [existingEmail] = await sql`select id from users where email = ${email} limit 1`;
  if (existingEmail) {
    console.error(`Refusing: a user with email ${email} already exists.`);
    process.exit(2);
  }

  const pin = generateRandomPin();
  const [created] = await sql`
    insert into users (email, name, role, hashed_pin, active)
    values (${email}, ${name}, 'OWNER', ${`TEMP$${pin}`}, true)
    returning id, email
  `;
  console.log(`Created OWNER ${created.email} (${created.id})`);
  console.log(`Temporary PIN (shown once, must be rotated on first login): ${pin}`);
}

async function rotateWeakPins(sql) {
  const users = await sql`select id, email, role, hashed_pin from users order by role, email`;
  const rotated = [];
  for (const u of users) {
    if (!WEAK_PINS.some((p) => pinMatches(p, u.hashed_pin))) continue;
    const pin = generateRandomPin();
    await sql`update users set hashed_pin = ${`TEMP$${pin}`}, updated_at = now() where id = ${u.id}`;
    rotated.push({ email: u.email, role: u.role, pin });
  }
  if (!rotated.length) {
    console.log(`No weak PINs found across ${users.length} users.`);
    return;
  }
  console.log(`Rotated ${rotated.length} of ${users.length} users (temporary PINs, shown once):`);
  for (const r of rotated) console.log(`  ${r.role.padEnd(10)} ${r.email.padEnd(36)} ${r.pin}`);
}

const command = process.argv[2];
if (!['create-owner', 'rotate-weak-pins'].includes(command)) usage();

const url = resolveDatabaseUrl();
if (!url) {
  console.error('Database URL missing — set DATABASE_URL or POSTGRES_URL.');
  process.exit(1);
}

const sql = postgres(url, postgresClientOptions(url));
try {
  if (command === 'create-owner') await createOwner(sql);
  else await rotateWeakPins(sql);
} catch (e) {
  console.error(`Failed: ${e.message || e}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
