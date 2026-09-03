#!/usr/bin/env node
/**
 * API authentication inventory — classify every App Router route handler.
 *
 * Usage:
 *   node scripts/api-auth-coverage.mjs
 *   npm run auth:coverage
 *
 * Exit 1 when any route is UNCLASSIFIED (release-gate fail).
 */
import fs from 'fs';
import path from 'path';

const API_ROOT = path.resolve('src/app/api');

/** Paths (relative to /api) intentionally unauthenticated at the edge/handler. */
const PUBLIC_API = [
  '/auth/',
  '/webhooks/',
  '/whatsapp/webhook',
  '/health',
  '/ops/health',
  '/seed',
  '/pos/catalog',
  '/pos/checkout',
  '/storefront/public',
  '/storefront/search',
  '/storefront/abandon-cart',
  '/config/flags',
  '/repairs/public',
  '/repairs/estimate',
  '/repairs/appointments',
  '/orders/track',
  '/promotions/evaluate-cart',
  '/promotions/validate',
  '/cron/',
  '/social/feeds/meta-catalog',
  '/payments/methods',
];

const STAFF_MARKERS = [
  'requireStaffSession',
  'getSession',
  'assertCanMutateCommerce',
  'assertRole',
];

const CUSTOMER_MARKERS = ['getCustomerSession'];

const WEBHOOK_MARKERS = [
  'verifyPayHereSignature',
  'verifyWhatsAppWebhookSignature',
  'payHereWebhookSecretRequired',
];

const CRON_MARKERS = ['CRON_SECRET', 'authorizeCron'];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.name === 'route.ts') out.push(full);
  }
  return out;
}

function fileToApiPath(file) {
  const rel = path.relative(API_ROOT, path.dirname(file)).split(path.sep).join('/');
  return rel === '' ? '/' : `/${rel}`;
}

function isPublicApi(apiPath) {
  if (/^\/orders\/[^/]+\/invoice$/.test(apiPath)) return true;
  return PUBLIC_API.some((p) => {
    if (p.endsWith('/')) return apiPath === p.slice(0, -1) || apiPath.startsWith(p) || apiPath + '/' === p;
    return apiPath === p || apiPath.startsWith(p + '/');
  });
}

function hasAny(src, markers) {
  return markers.some((m) => src.includes(m));
}

function classify(apiPath, src) {
  const isWebhookPath = apiPath.startsWith('/webhooks/') || apiPath === '/whatsapp/webhook';
  const isCronPath = apiPath.startsWith('/cron/');

  if (isCronPath || hasAny(src, CRON_MARKERS)) return 'CRON';
  if (isWebhookPath || hasAny(src, WEBHOOK_MARKERS)) return 'WEBHOOK';
  if (hasAny(src, CUSTOMER_MARKERS) && !hasAny(src, STAFF_MARKERS)) return 'CUSTOMER';
  if (hasAny(src, STAFF_MARKERS)) {
    if (hasAny(src, CUSTOMER_MARKERS)) return 'STAFF+CUSTOMER';
    return 'STAFF';
  }
  if (isPublicApi(apiPath)) return 'PUBLIC';
  return 'UNCLASSIFIED';
}

export function scanApiAuthCoverage() {
  const files = walk(API_ROOT).sort();
  const rows = files.map((file) => {
    const apiPath = fileToApiPath(file);
    const src = fs.readFileSync(file, 'utf8');
    const category = classify(apiPath, src);
    return { apiPath, file: path.relative(process.cwd(), file), category };
  });

  const counts = {};
  for (const r of rows) counts[r.category] = (counts[r.category] || 0) + 1;

  const unclassified = rows.filter((r) => r.category === 'UNCLASSIFIED');
  return { rows, counts, unclassified, total: rows.length };
}

function printReport(result) {
  console.log('\nAPI AUTH COVERAGE\n');
  const order = ['PUBLIC', 'STAFF', 'STAFF+CUSTOMER', 'CUSTOMER', 'WEBHOOK', 'CRON', 'UNCLASSIFIED'];
  for (const key of order) {
    if (result.counts[key] != null) {
      console.log(`${key.padEnd(20)} ${String(result.counts[key]).padStart(3)}`);
    }
  }
  for (const key of Object.keys(result.counts).sort()) {
    if (!order.includes(key)) console.log(`${key.padEnd(20)} ${String(result.counts[key]).padStart(3)}`);
  }
  console.log(`${'TOTAL'.padEnd(20)} ${String(result.total).padStart(3)}`);
  console.log('');

  if (result.unclassified.length) {
    console.log('UNCLASSIFIED routes (must fix or allowlist):');
    for (const r of result.unclassified) {
      console.log(`  ✗ ${r.apiPath}  (${r.file})`);
    }
    console.log('');
    console.log('AUTH COVERAGE: FAIL\n');
    return false;
  }

  console.log('AUTH COVERAGE: PASS\n');
  return true;
}

if (process.argv[1]?.includes('api-auth-coverage')) {
  const result = scanApiAuthCoverage();
  const ok = printReport(result);
  process.exit(ok ? 0 : 1);
}
