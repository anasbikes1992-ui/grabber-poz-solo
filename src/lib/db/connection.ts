/**
 * Resolve Postgres connection string from Vercel Supabase integration or manual env.
 * Vercel Supabase sets POSTGRES_URL; this app historically used DATABASE_URL.
 * Keep in sync with scripts/lib/resolve-db-url.mjs
 */
function pickEnv(...keys: string[]): string | null {
  for (const key of keys) {
    const raw = process.env[key];
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
  }
  return null;
}

export function resolveDatabaseUrl(): string | null {
  const url = pickEnv(
    'DATABASE_URL',
    'database_url',
    'POSTGRES_URL',
    'POSTGRES_PRISMA_URL',
    'POSTGRES_URL_NON_POOLING',
    'SUPABASE_DB_URL',
  );

  if (url) return url;

  // Local dev fallback only — never use localhost on Vercel builds.
  if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
    return 'postgresql://postgres:postgres@localhost:5432/grabber_business_os';
  }

  return null;
}

/** Safe diagnostics for /api/health — never exposes secret values. */
export function databaseEnvDiagnostics() {
  return {
    vercel: Boolean(process.env.VERCEL),
    nodeEnv: process.env.NODE_ENV || 'development',
    DATABASE_URL: Boolean(pickEnv('DATABASE_URL')),
    POSTGRES_URL: Boolean(pickEnv('POSTGRES_URL')),
    POSTGRES_URL_NON_POOLING: Boolean(pickEnv('POSTGRES_URL_NON_POOLING')),
  };
}

export function hasDatabaseUrl(): boolean {
  return Boolean(resolveDatabaseUrl());
}

export function isSupabaseConnection(connectionString: string): boolean {
  return (
    connectionString.includes('supabase.co') ||
    connectionString.includes('pooler.supabase.com') ||
    connectionString.includes('supabase.com')
  );
}
