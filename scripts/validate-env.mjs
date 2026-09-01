#!/usr/bin/env node

/**
 * GRABBER BUSINESS OS — PRE-FLIGHT ENVIRONMENT VALIDATOR
 *
 * Usage:
 *   node scripts/validate-env.mjs
 *   node scripts/validate-env.mjs --env-file .env.production
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { hasDatabaseUrl, resolveDatabaseUrl } from './lib/resolve-db-url.mjs';

const args = process.argv.slice(2);
const envFileIdx = args.indexOf('--env-file');
const targetEnvFile = envFileIdx !== -1 && args[envFileIdx + 1] ? args[envFileIdx + 1] : '.env';
const isProduction =
  process.env.NODE_ENV === 'production' ||
  /prod/i.test(targetEnvFile) ||
  args.includes('--production');

if (fs.existsSync(targetEnvFile)) {
  dotenv.config({ path: path.resolve(targetEnvFile), override: true });
} else if (fs.existsSync('.env.local')) {
  dotenv.config({ path: path.resolve('.env.local') });
} else {
  dotenv.config();
}

const maskSecret = (val) => {
  if (!val) return '(not configured)';
  if (val.length <= 8) return '********';
  return `${val.slice(0, 3)}****${val.slice(-4)}`;
};

export async function runEnvironmentValidation() {
  console.log(`\n======================================================`);
  console.log(`GRABBER BUSINESS OS: PRE-FLIGHT ENVIRONMENT VALIDATION`);
  console.log(`======================================================`);
  console.log(
    `Target Config File: ${
      fs.existsSync(targetEnvFile)
        ? targetEnvFile
        : fs.existsSync('.env.local')
          ? '.env.local'
          : 'System Environment'
    }`
  );
  console.log(`Node Environment:   ${process.env.NODE_ENV || 'development'}`);
  console.log(`Strict production:  ${isProduction ? 'YES (AUTH_SECRET is P0)' : 'NO'}`);
  console.log(`Timestamp:          ${new Date().toISOString()}`);
  console.log(`======================================================\n`);

  const p0Errors = [];
  const p1Warnings = [];
  const p2Notices = [];
  const activeIntegrations = [];

  console.log(`[P0] CORE RUNTIME CONFIGURATION`);

  const dbUrl = resolveDatabaseUrl();
  const dbSource = process.env.DATABASE_URL
    ? 'DATABASE_URL'
    : process.env.POSTGRES_URL
      ? 'POSTGRES_URL'
      : process.env.POSTGRES_PRISMA_URL
        ? 'POSTGRES_PRISMA_URL'
        : process.env.POSTGRES_URL_NON_POOLING
          ? 'POSTGRES_URL_NON_POOLING'
          : null;

  if (!hasDatabaseUrl()) {
    p0Errors.push(
      'Database URL is missing. Set DATABASE_URL or connect Supabase on Vercel (POSTGRES_URL).',
    );
    console.log(`  ✗ DATABASE_URL:             MISSING (CRITICAL)`);
  } else {
    try {
      const parsedUrl = new URL(dbUrl.replace(/^postgres(ql)?:\/\//, 'http://'));
      const isPooler =
        dbUrl.includes('pooler.supabase.com') ||
        dbUrl.includes('6543') ||
        dbUrl.includes('pgbouncer=true');
      console.log(`  ✓ DATABASE:                 CONFIGURED via ${dbSource} (${parsedUrl.hostname})`);
      if (isPooler) {
        console.log(`    ↳ Connection Mode:        Transaction Pooler Detected`);
      } else {
        p1Warnings.push(
          'Database URL uses direct Postgres. For Vercel/serverless, use Supabase pooler (port 6543).',
        );
        console.log(`    ↳ Connection Mode:        Direct Connection (pooler recommended on Vercel)`);
      }
    } catch {
      p0Errors.push('Database URL format is invalid. Must be a valid postgresql:// URI.');
      console.log(`  ✗ DATABASE:                 INVALID FORMAT`);
    }
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (!appUrl) {
    p0Errors.push('NEXT_PUBLIC_APP_URL is missing. Required for canonical URLs, receipt links, and webhooks.');
    console.log(`  ✗ NEXT_PUBLIC_APP_URL:      MISSING (CRITICAL)`);
  } else {
    try {
      new URL(appUrl);
      console.log(`  ✓ NEXT_PUBLIC_APP_URL:      ${appUrl}`);
      if (isProduction && /-[a-z0-9]{8,}-[a-z0-9-]+\.vercel\.app$/i.test(appUrl)) {
        p1Warnings.push(
          'NEXT_PUBLIC_APP_URL looks like a Vercel preview deployment. Use the production alias (e.g. grabber-poz-solo.vercel.app) for webhooks and receipts.',
        );
        console.log(`    ↳ Warning:                Preview URL detected — use production alias`);
      }
    } catch {
      p0Errors.push('NEXT_PUBLIC_APP_URL must be a valid URL starting with http:// or https://');
      console.log(`  ✗ NEXT_PUBLIC_APP_URL:      INVALID URL (${appUrl})`);
    }
  }

  const authSecret =
    process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
  if (!authSecret) {
    const msg =
      'AUTH_SECRET / SESSION_SECRET is not set. Do not deploy without a strong random secret.';
    if (isProduction) {
      p0Errors.push(msg);
      console.log(`  ✗ AUTH_SECRET:              MISSING (CRITICAL in production)`);
    } else {
      p1Warnings.push(msg + ' (P1 in non-production; P0 with --production / NODE_ENV=production)');
      console.log(`  ⚠ AUTH_SECRET:              NOT SET`);
    }
  } else if (authSecret.length < 32 && isProduction) {
    p0Errors.push('AUTH_SECRET must be at least 32 characters in production.');
    console.log(`  ✗ AUTH_SECRET:              TOO SHORT (<32 chars)`);
  } else {
    console.log(`  ✓ AUTH_SECRET:              CONFIGURED (${maskSecret(authSecret)})`);
  }

  console.log(`\n[P1] STORAGE & SUPABASE CLIENT LAYER`);
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (sbUrl && sbAnonKey) {
    console.log(`  ✓ Supabase Edge Client:     CONFIGURED (${sbUrl})`);
    activeIntegrations.push('Supabase Storage & Realtime');
  } else {
    p2Notices.push(
      'NEXT_PUBLIC_SUPABASE_URL / ANON_KEY not set. Storage proxy may operate in local/fallback mode.'
    );
    console.log(`  ℹ Supabase Edge Client:     Optional (Not configured)`);
  }

  console.log(`\n[P1] EXTERNAL COMMERCE & LOGISTICS INTEGRATIONS`);

  if (process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_SECRET) {
    const mode = process.env.PAYHERE_MODE || 'live';
    console.log(
      `  ✓ PayHere Gateway:          ACTIVE (Merchant: ${maskSecret(process.env.PAYHERE_MERCHANT_ID)}, Mode: ${mode})`
    );
    activeIntegrations.push(`PayHere Payment Gateway (${mode})`);
  } else {
    console.log(`  ℹ PayHere Gateway:          Disabled (webhook needs PAYHERE_SECRET when enabled)`);
  }

  const lkrProvider = (process.env.PAYMENTS_LKR_PROVIDER || '').toUpperCase();
  if (lkrProvider === 'WEBXPAY') {
    const wxEnv = process.env.WEBXPAY_ENV || 'staging';
    const wxOk = process.env.WEBXPAY_PUBLIC_KEY && process.env.WEBXPAY_SECRET_KEY;
    console.log(
      `  ${wxOk ? '✓' : '✗'} WebXPay (${wxEnv}):         ${wxOk ? 'CONFIGURED' : 'INCOMPLETE — set PUBLIC + SECRET keys'}`
    );
    if (wxOk) activeIntegrations.push(`WebXPay (${wxEnv})`);
  } else if (lkrProvider === 'PAYHERE') {
    console.log(`  ℹ LKR provider:             PAYHERE (use PAYHERE_* vars)`);
  } else {
    console.log(`  ℹ LKR online payments:      Disabled (storefront uses COD)`);
  }

  if (process.env.STRIPE_SECRET_KEY) {
    console.log(`  ℹ Stripe:                   Key set (online checkout not wired yet)`);
  }

  console.log(`\n[P2] MARKETING & ANALYTICS (optional)`);
  const pixelVars = [
    ['Meta Pixel', process.env.NEXT_PUBLIC_META_PIXEL_ID],
    ['GA4', process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID],
    ['GTM', process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID],
    ['TikTok', process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID],
  ];
  for (const [label, val] of pixelVars) {
    if (val) {
      console.log(`  ✓ ${label.padEnd(22)} ${maskSecret(val)}`);
      activeIntegrations.push(label);
    }
  }
  if (process.env.META_CONVERSIONS_API_TOKEN) {
    p2Notices.push('META_CONVERSIONS_API_TOKEN is set but server-side CAPI is not wired yet.');
    console.log(`  ℹ Meta CAPI token:          Set (not wired)`);
  }
  if (!pixelVars.some(([, v]) => v)) {
    console.log(`  ℹ Storefront pixels:        Use env vars or staff UI /marketing`);
  }

  if (process.env.KOOMBIYO_API_KEY) {
    console.log(`  ✓ Koombiyo Courier:         ACTIVE (Key: ${maskSecret(process.env.KOOMBIYO_API_KEY)})`);
    activeIntegrations.push('Koombiyo Islandwide Logistics');
  } else {
    console.log(`  ℹ Koombiyo Courier:         Disabled (In-house delivery)`);
  }

  const waToken = (process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const waPhoneId = (process.env.WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const waVerify = (process.env.WHATSAPP_VERIFY_TOKEN || '').trim();

  if (waToken && waPhoneId) {
    console.log(`  ✓ WhatsApp Cloud API:       ACTIVE (Phone ID: ${maskSecret(waPhoneId)})`);
    if (waVerify) console.log(`    ↳ Verify token:         ${maskSecret(waVerify)}`);
    if (process.env.WHATSAPP_APP_SECRET) console.log(`    ↳ App secret:           configured (webhook signature)`);
    if (process.env.WHATSAPP_API_VERSION) console.log(`    ↳ API version:          ${process.env.WHATSAPP_API_VERSION.trim()}`);
    activeIntegrations.push('Meta WhatsApp Cloud API');
  } else if (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER) {
    console.log(`  ✓ WhatsApp Direct Hotline:  ACTIVE (${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER})`);
    activeIntegrations.push('WhatsApp Direct Click-to-Chat');
  } else {
    console.log(`  ℹ WhatsApp Messaging:       Disabled`);
  }

  console.log(`\n======================================================`);
  console.log(`PRE-FLIGHT VALIDATION SUMMARY`);
  console.log(`======================================================`);
  console.log(`P0 Critical Errors:  ${p0Errors.length === 0 ? '0 (PASSED)' : `${p0Errors.length} (BLOCKED)`}`);
  console.log(`P1 Warnings:         ${p1Warnings.length}`);
  console.log(`P2 Notices:          ${p2Notices.length}`);
  console.log(
    `Active Integrations: ${
      activeIntegrations.length > 0 ? activeIntegrations.join(', ') : 'Base POS & Offline Commerce'
    }`
  );
  console.log(`======================================================\n`);

  if (p0Errors.length > 0) {
    console.error(`PRE-FLIGHT FAILED: ${p0Errors.length} critical error(s):`);
    p0Errors.forEach((err, idx) => console.error(`   ${idx + 1}. ${err}`));
    console.error(`\nResolve these in ${targetEnvFile} before proceeding.\n`);
    return { success: false, p0Errors, p1Warnings, p2Notices };
  }

  if (p1Warnings.length > 0) {
    console.warn(`PRE-FLIGHT PASSED WITH WARNINGS:`);
    p1Warnings.forEach((warn, idx) => console.warn(`   ${idx + 1}. ${warn}`));
    console.log(``);
  } else {
    console.log(`ALL PRE-FLIGHT CHECKS PASSED.\n`);
  }

  return { success: true, p0Errors, p1Warnings, p2Notices };
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  runEnvironmentValidation().then(({ success }) => {
    process.exit(success ? 0 : 1);
  });
}
