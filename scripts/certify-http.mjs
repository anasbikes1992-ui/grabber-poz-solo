#!/usr/bin/env node

/**
 * HTTP smoke certification — public storefront + health endpoints.
 *
 * Usage:
 *   node scripts/certify-http.mjs
 *   CERTIFY_HTTP_BASE_URL=https://grabber-poz-solo.vercel.app node scripts/certify-http.mjs
 */

const base = (process.env.CERTIFY_HTTP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

const checks = [
  { name: 'health', path: '/api/health', expectStatus: 200 },
  { name: 'homepage', path: '/', expectStatus: 200 },
  { name: 'robots', path: '/robots.txt', expectStatus: 200, expectBody: 'Disallow: /adminpoz' },
  { name: 'sitemap', path: '/sitemap.xml', expectStatus: 200 },
  { name: 'storefront-public', path: '/api/storefront/public', expectStatus: 200 },
  { name: 'shop-checkout', path: '/shop/checkout', expectStatus: 200 },
  { name: 'shop-repairs', path: '/shop/repairs', expectStatus: 200 },
  { name: 'shop-repair-track', path: '/shop/repairs/track', expectStatus: 200 },
];

async function run() {
  console.log(`\nHTTP CERTIFICATION — ${base}\n`);
  let failed = 0;

  for (const c of checks) {
    const url = `${base}${c.path}`;
    try {
      const res = await fetch(url, { redirect: 'follow' });
      const body = c.expectBody ? await res.text() : '';
      const statusOk = res.status === c.expectStatus;
      const bodyOk = !c.expectBody || body.includes(c.expectBody);
      const ok = statusOk && bodyOk;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(18)} ${res.status} ${url}`);
      if (!statusOk || !bodyOk) failed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`FAIL  ${c.name.padEnd(18)} ERR  ${url} — ${message}`);
      failed += 1;
    }
  }

  console.log(`\nResult: ${failed === 0 ? 'PASS' : `${failed} failed`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

run();
