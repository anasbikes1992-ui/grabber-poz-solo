#!/usr/bin/env node
/**
 * Thin Lighthouse mobile runner via npx (GRW-07).
 * Requires Chrome. Does not add a permanent dependency.
 *
 * Usage:
 *   BASE=https://… npm run lighthouse:shop
 *   LH_PRODUCT_SLUG=my-slug npm run lighthouse:product
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const target = process.argv[2] || 'shop';
const base = (process.env.BASE || process.env.CERTIFY_HTTP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://grabber-poz-solo.vercel.app').replace(
  /\/$/,
  '',
);

const paths = {
  shop: '/shop',
  product: `/products/${process.env.LH_PRODUCT_SLUG || 'demo'}`,
  checkout: '/shop/checkout',
  home: '/',
};

const rel = paths[target] || paths.shop;
const url = `${base}${rel}`;
const outDir = path.join(root, 'reports');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `lh-${target}.json`);

console.log(`\nLighthouse mobile → ${url}\n`);

const args = [
  '--yes',
  'lighthouse@11',
  url,
  '--only-categories=performance,accessibility',
  '--form-factor=mobile',
  '--screenEmulation.mobile',
  '--quiet',
  '--chrome-flags=--headless',
  '--output=json',
  `--output-path=${outFile}`,
];

const r = spawnSync('npx', args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });

if (r.status !== 0) {
  console.error('\nLighthouse failed. Install Chrome or set CHROME_PATH. See docs/LIGHTHOUSE_MOBILE.md\n');
  process.exit(r.status || 1);
}

try {
  const report = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  const cats = report.categories || {};
  const perf = Math.round((cats.performance?.score || 0) * 100);
  const a11y = Math.round((cats.accessibility?.score || 0) * 100);
  console.log(`Performance: ${perf}  (target ≥ 80)`);
  console.log(`Accessibility: ${a11y}  (target ≥ 90 on shop/home)`);
  console.log(`Report: ${outFile}`);
  const fail = perf < 80 || (['shop', 'home'].includes(target) && a11y < 90);
  process.exit(fail ? 1 : 0);
} catch (err) {
  console.error('Could not parse report:', err.message);
  process.exit(1);
}
