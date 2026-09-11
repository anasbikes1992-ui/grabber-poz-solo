-- GRABBER SOLO — RLS baseline (all public tables)
-- Next.js API uses DATABASE_URL (postgres / service role) and bypasses RLS.
-- PostgREST anon/authenticated: deny by default (RLS enabled, no permissive policies).

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relispartition
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- Remove legacy partial policies (deny-by-default is safer for Solo)
DROP POLICY IF EXISTS staff_read_orders ON public.orders;
DROP POLICY IF EXISTS staff_read_products ON public.products;

-- Revoke direct table access from Supabase API roles. Guarded: `anon` /
-- `authenticated` only exist on Supabase-hosted Postgres — a vanilla
-- self-hosted instance (Coolify, plain postgres:16-alpine) has neither, and
-- unconditional REVOKE/GRANT against a nonexistent role hard-fails the whole
-- script there.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon';
    EXECUTE 'GRANT USAGE ON SCHEMA public TO anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated';
    EXECUTE 'GRANT USAGE ON SCHEMA public TO authenticated';
  END IF;
END $$;
