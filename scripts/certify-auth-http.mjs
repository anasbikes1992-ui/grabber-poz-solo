#!/usr/bin/env node
/**
 * Live HTTP auth regression — privileged APIs must reject garbage/missing staff cookies.
 *
 * Usage:
 *   CERTIFY_HTTP_BASE_URL=https://grabber-poz-solo.vercel.app npm run client:certify:auth
 */
const base = (
  process.env.CERTIFY_HTTP_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000'
).replace(/\/$/, '');

const checks = [
  { name: 'inventory-garbage', path: '/api/inventory', cookie: 'grabber_session=not-valid', expectStatus: 401 },
  { name: 'products-garbage', path: '/api/products', cookie: 'grabber_session=abc.def', expectStatus: 401 },
  { name: 'polim-garbage', path: '/api/polim-potha', cookie: 'grabber_session=x', expectStatus: 401 },
  { name: 'inventory-missing', path: '/api/inventory', expectStatus: 401 },
  { name: 'whatsapp-send', path: '/api/integrations/whatsapp/send', method: 'POST', expectStatus: 401 },
  { name: 'cron-no-secret', path: '/api/cron/process-jobs', expectStatus: [401, 503] },
];

async function run() {
  console.log(`\nAUTH HTTP CERTIFICATION — ${base}\n`);
  let failed = 0;

  for (const c of checks) {
    const url = `${base}${c.path}`;
    try {
      const headers = {};
      if (c.cookie) headers.cookie = c.cookie;
      if (c.method === 'POST') headers['content-type'] = 'application/json';
      const res = await fetch(url, {
        method: c.method || 'GET',
        headers,
        body: c.method === 'POST' ? '{}' : undefined,
        redirect: 'manual',
      });
      const expected = Array.isArray(c.expectStatus) ? c.expectStatus : [c.expectStatus];
      const ok = expected.includes(res.status);
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(22)} ${res.status} ${url}`);
      if (!ok) failed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`FAIL  ${c.name.padEnd(22)} ERR  ${url} — ${message}`);
      failed += 1;
    }
  }

  console.log(`\nResult: ${failed === 0 ? 'PASS' : `${failed} failed`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

run();
