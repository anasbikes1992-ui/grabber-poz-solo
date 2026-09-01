#!/usr/bin/env node
/**
 * Sync critical env vars from .env.local → Vercel (production + preview).
 * Does not print secret values.
 */
import { spawnSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const PROJECT = process.env.VERCEL_PROJECT || 'grabber-business-os';
const TARGETS = ['production'];

function normalizeDatabaseUrl(raw) {
  if (!raw) return null;
  try {
    const parsed = new URL(raw.replace(/^postgresql:\/\//, 'https://'));
    if (parsed.hostname.startsWith('db.') && parsed.hostname.endsWith('.supabase.co')) {
      const ref = parsed.hostname.replace('db.', '').replace('.supabase.co', '');
      const password = decodeURIComponent(parsed.password);
      const poolUser = parsed.username.includes('.') ? parsed.username : `postgres.${ref}`;
      return `postgresql://${poolUser}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
    }
    if (raw.includes('pooler.supabase.com') && !raw.includes('pgbouncer=true')) {
      return raw.includes('?') ? `${raw}&pgbouncer=true` : `${raw}?pgbouncer=true`;
    }
    return raw;
  } catch {
    return raw;
  }
}

const rawDb = process.env.DATABASE_URL || process.env.database_url;
const dbUrl = normalizeDatabaseUrl(rawDb);

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl && rawDb) {
  try {
    const parsed = new URL(rawDb.replace(/^postgresql:\/\//, 'https://'));
    if (parsed.hostname.startsWith('db.')) {
      const ref = parsed.hostname.replace('db.', '').replace('.supabase.co', '');
      supabaseUrl = `https://${ref}.supabase.co`;
    }
  } catch {
    /* ignore */
  }
}

const VARS = [
  ['DATABASE_URL', dbUrl],
  ['NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
  ['AUTH_SECRET', process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET],
  ['MASTER_ENCRYPTION_KEY', process.env.MASTER_ENCRYPTION_KEY],
  ['NEXT_PUBLIC_STORE_NAME', process.env.NEXT_PUBLIC_STORE_NAME || 'Grabber Business OS'],
  ['NEXT_PUBLIC_SUPABASE_URL', supabaseUrl],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
  ['SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY],
  ['WHATSAPP_VERIFY_TOKEN', process.env.WHATSAPP_VERIFY_TOKEN],
].filter(([, v]) => typeof v === 'string' && v.length > 0);

if (VARS.length === 0) {
  console.error('No variables to sync — fill .env.local first.');
  process.exit(1);
}

function run(args, input) {
  const r = spawnSync('npx', ['vercel', ...args], {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  return { code: r.status ?? 1, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

console.log(`Syncing ${VARS.length} vars to Vercel "${PROJECT}" (${TARGETS.join(', ')})…\n`);

for (const env of TARGETS) {
  for (const [name, value] of VARS) {
    const args = ['env', 'add', name, env, '--yes', '--force', '--sensitive'];
    const { code, out } = run(args, value);
    const ok = code === 0 || /Updated|Added|Overrode|already exists/i.test(out);
    console.log(`${ok ? '✓' : '✗'} ${name} → ${env}`);
    if (!ok) console.log(`  ${out.slice(0, 240)}`);
  }
}

console.log('\nNext: npx vercel --prod --project grabber-business-os');
