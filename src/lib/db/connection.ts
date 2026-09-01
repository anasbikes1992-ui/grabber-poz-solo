/**
 * Resolve Postgres connection string from Vercel Supabase integration or manual env.
 * Vercel Supabase sets POSTGRES_URL; this app historically used DATABASE_URL.
 * Keep in sync with scripts/lib/resolve-db-url.mjs
 */
export function resolveDatabaseUrl(): string | null {
  const url =
    process.env.DATABASE_URL ||
    process.env.database_url ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.SUPABASE_DB_URL ||
    null;

  if (url) return url;

  // Local dev fallback only — never use localhost on Vercel builds.
  if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
    return 'postgresql://postgres:postgres@localhost:5432/grabber_business_os';
  }

  return null;
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
