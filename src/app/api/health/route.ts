import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { hasDatabaseUrl, databaseEnvDiagnostics } from '@/lib/db/connection';
import { isSentryEnabled } from '@/lib/observability/sentry';

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
    const [row] = await db.execute(sql`SELECT 1 AS ok`);
    const ok = Boolean((row as { ok?: number })?.ok ?? (Array.isArray(row) && row[0]?.ok));
    return NextResponse.json({
      ...base,
      db: ok ? 'connected' : 'degraded',
    });
  } catch (err) {
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
