-- GRABBER SOLO — RLS baseline (run after schema apply)
-- App server uses DATABASE_URL (postgres/service_role) which bypasses RLS.
-- These policies lock down PostgREST anon/authenticated access.

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polim_potha_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polim_potha_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Deny all for anon by default (no policies for anon = no access when RLS on)
-- Authenticated staff: read-only example policies (tighten per role later)

CREATE POLICY staff_read_orders ON public.orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY staff_read_products ON public.products
  FOR SELECT TO authenticated USING (true);

-- Explicitly revoke table DML from anon if previously granted
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
