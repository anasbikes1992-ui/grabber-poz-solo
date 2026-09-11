-- 0006 — Enable RLS on all public tables (Supabase Advisor: RLS Disabled in Public)
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

DROP POLICY IF EXISTS staff_read_orders ON public.orders;
DROP POLICY IF EXISTS staff_read_products ON public.products;

-- The statements below lock down Supabase's auto-generated PostgREST API
-- (roles `anon`/`authenticated`), which only exists on Supabase-hosted
-- Postgres. The app itself always connects with its own DATABASE_URL role
-- and bypasses RLS as the table owner (RLS applies to non-owner roles only,
-- and FORCE ROW LEVEL SECURITY is not set) — so this section is genuine
-- defense-in-depth on Supabase and a meaningless no-op everywhere else. Guard
-- it so a vanilla self-hosted Postgres (Coolify, plain `postgres:16-alpine`,
-- no PostgREST layer) doesn't hard-fail bootstrapping on a role that will
-- never exist there.
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
