#!/usr/bin/env node
/**
 * Production heartbeat for a live single-business Grabber deployment.
 *
 * Intended schedule: every 15 minutes in Coolify/Cron.
 *
 * Required for cron processing:
 *   CRON_SECRET=<same as app env>
 *
 * Optional protected checks:
 *   CERTIFY_STAFF_COOKIE="grabber_session=..."
 *
 * Usage:
 *   CERTIFY_HTTP_BASE_URL=https://grabberpoz.com CRON_SECRET=... npm run ops:heartbeat
 */

const base = (
  process.env.CERTIFY_HTTP_BASE_URL ||
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://grabberpoz.com'
).replace(/\/$/, '');

const cronSecret = process.env.CRON_SECRET || '';
const staffCookie = process.env.CERTIFY_STAFF_COOKIE || '';

async function fetchJson(path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    redirect: 'follow',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'grabber-ops-heartbeat/1.0',
      ...(options.headers || {}),
    },
    ...options,
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const failures = [];
  const warnings = [];

  console.log(`OPS HEARTBEAT - ${base}`);

  try {
    const { res, json } = await fetchJson('/api/health');
    assert(res.ok && json?.success === true && json?.db === 'connected', `/api/health failed (${res.status})`);
    console.log(`PASS health db=${json.db} build=${json.build || 'unknown'}`);
  } catch (err) {
    failures.push(err instanceof Error ? err.message : String(err));
  }

  if (cronSecret) {
    try {
      const { res, json } = await fetchJson('/api/cron/process-jobs', {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      assert(res.ok && json?.success === true, `/api/cron/process-jobs failed (${res.status})`);
      console.log(`PASS cron claimed=${json.claimed} processed=${json.processed} failed=${json.failed}`);
      if (json.failed > 0) warnings.push(`Cron processed with ${json.failed} failed job(s).`);
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err));
    }
  } else {
    warnings.push('CRON_SECRET not supplied; skipped /api/cron/process-jobs.');
  }

  if (staffCookie) {
    try {
      const { res, json } = await fetchJson('/api/ops/health', {
        headers: { Cookie: staffCookie },
      });
      assert(res.ok && json?.success === true, `/api/ops/health failed (${res.status})`);
      console.log(`PASS ops status=${json.status} deadJobs=${json.deadJobs} failedWebhooks=${json.failedWebhooks}`);
      if (Array.isArray(json.failures)) failures.push(...json.failures);
      if (Array.isArray(json.warnings)) warnings.push(...json.warnings);
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err));
    }
  } else {
    warnings.push('CERTIFY_STAFF_COOKIE not supplied; skipped protected /api/ops/health.');
  }

  for (const warning of warnings) console.log(`WARN ${warning}`);

  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    console.error('OPS HEARTBEAT: FAIL');
    process.exit(1);
  }

  console.log('OPS HEARTBEAT: PASS');
}

main().catch((err) => {
  console.error(`OPS HEARTBEAT: FAIL - ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
