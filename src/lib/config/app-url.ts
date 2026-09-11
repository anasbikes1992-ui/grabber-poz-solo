/**
 * Server-side app URL / Supabase / store-name resolution.
 *
 * Why this exists: `NEXT_PUBLIC_*` variables are inlined by webpack's
 * DefinePlugin at BUILD time across every compiled module — including server
 * route handlers, not just browser bundles. In a shared-image, one-container-
 * per-tenant fleet, the image is built once and each tenant's container gets
 * its own runtime env — but a value read as `process.env.NEXT_PUBLIC_APP_URL`
 * in server code is frozen to whatever was set when the image was built, not
 * what's set on that tenant's container.
 *
 * DefinePlugin only rewrites a literal `process.env.NEXT_PUBLIC_X` member
 * expression — it does not evaluate bracket access with a variable key. So
 * the legacy-name fallback below is read via `readEnv(name)` (bracket
 * indexing), never as a direct `process.env.NEXT_PUBLIC_*` expression, which
 * keeps it a genuine runtime read instead of a build-time-frozen literal.
 * (Confirmed empirically: writing the fallback as a direct member expression
 * here caused it to spread into every route file that imports this module —
 * webpack duplicates whatever a shared module references into each server
 * chunk that pulls it in.)
 *
 * Client components still read `NEXT_PUBLIC_*` directly where genuinely
 * needed — that's the one case build-time inlining is correct for.
 */

function readEnv(name: string): string | undefined {
  // eslint-disable-next-line no-restricted-syntax -- deliberate: bracket
  // access defeats webpack DefinePlugin's static NEXT_PUBLIC_* inlining.
  const v = process.env[name];
  return v && v.trim() ? v : undefined;
}

/** APP_URL / NEXT_PUBLIC_APP_URL only, no default — for callers with their own extra fallbacks. */
export function getConfiguredAppUrl(): string | undefined {
  return process.env.APP_URL ?? readEnv('NEXT_PUBLIC_APP_URL');
}

export function getAppUrl(): string {
  return getConfiguredAppUrl() ?? 'http://localhost:3000';
}

export function getSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL ?? readEnv('NEXT_PUBLIC_SUPABASE_URL');
}

export function getSupabaseAnonKey(): string | undefined {
  return process.env.SUPABASE_ANON_KEY ?? readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export function getStoreName(): string {
  return process.env.STORE_NAME ?? readEnv('NEXT_PUBLIC_STORE_NAME') ?? 'Grabber Solo Store';
}

/** Public storefront URL, if it differs from the app URL (custom shop domain). */
export function getStoreUrl(): string {
  return process.env.STORE_URL ?? readEnv('NEXT_PUBLIC_STORE_URL') ?? getAppUrl();
}
