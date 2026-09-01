import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

function resolveDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.database_url ||
    'postgresql://postgres:postgres@localhost:5432/grabber_business_os'
  );
}

const connectionString = resolveDatabaseUrl();
const isSupabase = connectionString.includes('supabase.co');

export const client = postgres(connectionString, {
  max: isSupabase ? 1 : 20,
  idle_timeout: 30,
  connect_timeout: 10,
  prepare: false,
  ssl: isSupabase ? 'require' : undefined,
});

export const db = drizzle(client, { schema });

export * from './schema';
