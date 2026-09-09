/**
 * Postgres URL resolution for Node scripts.
 * Keep in sync with src/lib/db/connection.ts
 */

export function resolveDatabaseUrl(env = process.env) {
  return (
    env.DATABASE_URL ||
    env.database_url ||
    env.POSTGRES_URL ||
    env.POSTGRES_PRISMA_URL ||
    env.POSTGRES_URL_NON_POOLING ||
    env.SUPABASE_DB_URL ||
    null
  );
}

/** Prefer direct connection for DDL migrations (pooler can fail on long scripts). */
export function resolveDirectDatabaseUrl(env = process.env) {
  const nonPooling = env.POSTGRES_URL_NON_POOLING;
  if (nonPooling) return nonPooling;

  const url = resolveDatabaseUrl(env);
  if (!url) return null;

  return url;
}

export function hasDatabaseUrl(env = process.env) {
  return Boolean(resolveDatabaseUrl(env));
}

export function isSupabaseConnection(connectionString) {
  return (
    connectionString.includes('supabase.co') ||
    connectionString.includes('pooler.supabase.com') ||
    connectionString.includes('supabase.com')
  );
}

export function postgresClientOptions(connectionString) {
  const isSupabase = isSupabaseConnection(connectionString);
  return {
    max: 1,
    prepare: false,
    connect_timeout: 15,
    ssl: isSupabase ? 'require' : undefined,
  };
}
