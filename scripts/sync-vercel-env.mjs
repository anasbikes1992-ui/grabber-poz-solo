#!/usr/bin/env node
/**
 * Sync env vars → Vercel (production + preview).
 * Does not print secret values.
 *
 * Usage:
 *   npm run ops:sync-env
 *   node scripts/sync-vercel-env.mjs --env-file .env.prod.txt
 */
import { spawnSync } from 'child_process';
import dotenv from 'dotenv';

const envFileIdx = process.argv.indexOf('--env-file');
const args = new Set(process.argv.slice(2));
if (envFileIdx !== -1 && process.argv[envFileIdx + 1]) {
  dotenv.config({ path: process.argv[envFileIdx + 1], override: true });
} else {
  dotenv.config({ path: '.env.local' });
  dotenv.config({ path: '.env' });
}

function trimEnv(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function env(name) {
  return trimEnv(process.env[name]);
}

// Aliases from Meta / manual Vercel naming
if (!env('WHATSAPP_PHONE_ID') && env('WHATSAPP_PHONE_NUMBER_ID')) {
  process.env.WHATSAPP_PHONE_ID = trimEnv(process.env.WHATSAPP_PHONE_NUMBER_ID);
}
if (!env('WHATSAPP_TOKEN') && env('WHATSAPP_ACCESS_TOKEN')) {
  process.env.WHATSAPP_TOKEN = trimEnv(process.env.WHATSAPP_ACCESS_TOKEN);
}

const PROJECT = env('VERCEL_PROJECT') || 'grabber-poz-solo';
const TARGETS = args.has('--preview') ? ['production', 'preview'] : ['production'];

function normalizeDatabaseUrl(raw) {
  if (!raw) return null;
  const cleaned = trimEnv(raw);
  try {
    const parsed = new URL(cleaned.replace(/^postgresql:\/\//, 'https://'));
    if (parsed.hostname.startsWith('db.') && parsed.hostname.endsWith('.supabase.co')) {
      const ref = parsed.hostname.replace('db.', '').replace('.supabase.co', '');
      const password = decodeURIComponent(parsed.password);
      const poolUser = parsed.username.includes('.') ? parsed.username : `postgres.${ref}`;
      return `postgresql://${poolUser}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
    }
    if (cleaned.includes('pooler.supabase.com') && !cleaned.includes('pgbouncer=true')) {
      return cleaned.includes('?') ? `${cleaned}&pgbouncer=true` : `${cleaned}?pgbouncer=true`;
    }
    return cleaned;
  } catch {
    return cleaned;
  }
}

const rawDb =
  env('DATABASE_URL') ||
  env('database_url') ||
  env('POSTGRES_URL') ||
  env('POSTGRES_PRISMA_URL') ||
  env('POSTGRES_URL_NON_POOLING');
const dbUrl = normalizeDatabaseUrl(rawDb);

let supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL');
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

const appUrl =
  env('NEXT_PUBLIC_APP_URL') ||
  env('CERTIFY_HTTP_BASE_URL') ||
  'https://grabber-poz-solo.vercel.app';

const OPTIONAL_VARS = [
  ['CERTIFY_HTTP_BASE_URL', env('CERTIFY_HTTP_BASE_URL') || appUrl],
  ['WHATSAPP_TOKEN', env('WHATSAPP_TOKEN')],
  ['WHATSAPP_PHONE_ID', env('WHATSAPP_PHONE_ID')],
  ['WHATSAPP_VERIFY_TOKEN', env('WHATSAPP_VERIFY_TOKEN')],
  ['WHATSAPP_APP_SECRET', env('WHATSAPP_APP_SECRET')],
  ['WHATSAPP_API_VERSION', env('WHATSAPP_API_VERSION')],
  ['KOOMBIYO_API_KEY', env('KOOMBIYO_API_KEY')],
  ['PAYMENTS_LKR_PROVIDER', env('PAYMENTS_LKR_PROVIDER')],
  ['WEBXPAY_ENV', env('WEBXPAY_ENV')],
  ['WEBXPAY_PUBLIC_KEY', env('WEBXPAY_PUBLIC_KEY')],
  ['WEBXPAY_SECRET_KEY', env('WEBXPAY_SECRET_KEY')],
  ['PAYHERE_MERCHANT_ID', env('PAYHERE_MERCHANT_ID')],
  ['PAYHERE_SECRET', env('PAYHERE_SECRET')],
  ['PAYHERE_MODE', env('PAYHERE_MODE')],
  ['STRIPE_SECRET_KEY', env('STRIPE_SECRET_KEY')],
  ['STRIPE_WEBHOOK_SECRET', env('STRIPE_WEBHOOK_SECRET')],
  ['NEXT_PUBLIC_META_PIXEL_ID', env('NEXT_PUBLIC_META_PIXEL_ID')],
  ['META_CONVERSIONS_API_TOKEN', env('META_CONVERSIONS_API_TOKEN')],
  ['NEXT_PUBLIC_GOOGLE_ANALYTICS_ID', env('NEXT_PUBLIC_GOOGLE_ANALYTICS_ID')],
  ['NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID', env('NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID')],
  ['NEXT_PUBLIC_TIKTOK_PIXEL_ID', env('NEXT_PUBLIC_TIKTOK_PIXEL_ID')],
].filter(([, v]) => typeof v === 'string' && v.length > 0);

const VARS = [
  ['DATABASE_URL', dbUrl],
  ['NEXT_PUBLIC_APP_URL', appUrl],
  ['AUTH_SECRET', env('AUTH_SECRET') || env('NEXTAUTH_SECRET')],
  ['MASTER_ENCRYPTION_KEY', env('MASTER_ENCRYPTION_KEY')],
  ['NEXT_PUBLIC_STORE_NAME', env('NEXT_PUBLIC_STORE_NAME') || 'Grabber Poz Solo'],
  ['NEXT_PUBLIC_SUPABASE_URL', supabaseUrl],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', env('NEXT_PUBLIC_SUPABASE_ANON_KEY')],
  ['SUPABASE_SERVICE_ROLE_KEY', env('SUPABASE_SERVICE_ROLE_KEY')],
  ...OPTIONAL_VARS,
].filter(([, v]) => typeof v === 'string' && v.length > 0);

if (VARS.length === 0) {
  console.error('No variables to sync — fill .env.local or pass --env-file .env.prod.txt');
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

for (const envTarget of TARGETS) {
  for (const [name, value] of VARS) {
    const args = ['env', 'add', name, envTarget, '--yes', '--force', '--sensitive'];
    const { code, out } = run(args, value);
    const ok = code === 0 || /Updated|Added|Overrode|already exists/i.test(out);
    console.log(`${ok ? '✓' : '✗'} ${name} → ${envTarget}`);
    if (!ok) console.log(`  ${out.slice(0, 240)}`);
  }
}

console.log('\nNext: redeploy production on Vercel');
console.log('Webhook URL: https://grabber-poz-solo.vercel.app/api/webhooks/whatsapp');
