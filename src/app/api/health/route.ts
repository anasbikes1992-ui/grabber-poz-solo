import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, resetDbConnection } from '@/db';
import { hasDatabaseUrl, databaseEnvDiagnostics } from '@/lib/db/connection';
import { isSentryEnabled } from '@/lib/observability/sentry';

// Production incidents 2026-09-12: a wedged Supabase connection (with the
// app's max:1 pool) can block this exact query forever, so nothing frees the
// one slot and the container stays "unhealthy" until someone restarts it
// manually. Bound the wait and force-recycle the connection on timeout — the
// next health check (or any request) then gets a fresh connection instead of
// piling up behind the same dead one.
const DB_CHECK_TIMEOUT_MS = 4_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** Lightweight health probe for cert / load balancers */
export async function GET() {
  const base = {
    success: true,
    ok: true,
    service: 'grabber-poz-solo',
    ts: new Date().toISOString(),
    sentry: isSentryEnabled() ? 'configured' : 'off',
  };

  if (!hasDatabaseUrl()) {
    return NextResponse.json({
      ...base,
      db: 'not_configured',
      env: databaseEnvDiagnostics(),
      hint: 'Add DATABASE_URL to the host env (VPS or Vercel) and restart.',
    });
  }

  try {
    const [row] = await withTimeout(db.execute(sql`SELECT 1 AS ok`), DB_CHECK_TIMEOUT_MS);
    const ok = Boolean((row as { ok?: number })?.ok ?? (Array.isArray(row) && row[0]?.ok));
    return NextResponse.json({
      ...base,
      db: ok ? 'connected' : 'degraded',
    });
  } catch (err) {
    // A hung query (not a fast rejection like an auth/syntax error) means the
    // underlying connection is dead — recycle it so the next request doesn't
    // queue behind the same wedged socket.
    resetDbConnection();
    return NextResponse.json(
      {
        ...base,
        ok: false,
        success: false,
        db: 'error',
        error: (err as Error).message,
      },
      { status: 503 },
    );
  }
}

export async function POST() {
  return GET();
}
