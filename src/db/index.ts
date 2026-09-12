import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { hasDatabaseUrl, isSupabaseConnection, resolveDatabaseUrl } from '@/lib/db/connection';

type Db = PostgresJsDatabase<typeof schema>;

let client: ReturnType<typeof postgres> | undefined;
let drizzleDb: Db | undefined;

function getDbInternal(): Db {
  if (drizzleDb) return drizzleDb;

  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    throw new Error(
      'Database URL missing. Set DATABASE_URL or connect the Supabase integration (POSTGRES_URL) on Vercel.',
    );
  }

  const isSupabase = isSupabaseConnection(connectionString);
  client = postgres(connectionString, {
    max: isSupabase ? 1 : 20,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false,
    ssl: isSupabase ? 'require' : undefined,
    // Production incident 2026-09-12: with max:1 on the Supabase pooler, a
    // single query that hangs (pooler-side stall, dead backend, etc.) blocks
    // every subsequent request forever — including /api/health — since
    // nothing ever frees the one connection slot. postgres.js runs
    // `connection` entries as SET commands right after connecting, so these
    // apply once per physical connection and survive pgbouncer transaction
    // pooling (unlike a startup-packet parameter, which some poolers drop).
    // Bounding both keeps a stuck statement or an accidentally-open
    // transaction from taking the whole app down until someone notices and
    // restarts the container.
    connection: {
      statement_timeout: 10_000,
      idle_in_transaction_session_timeout: 10_000,
    },
  });

  drizzleDb = drizzle(client, { schema });
  return drizzleDb;
}

/** Lazy Drizzle client — avoids localhost fallback during Vercel build. */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = getDbInternal();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});

export { hasDatabaseUrl, resolveDatabaseUrl } from '@/lib/db/connection';
export * from './schema';
