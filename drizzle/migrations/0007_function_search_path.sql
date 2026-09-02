-- Pin search_path on stock movement guard (Supabase Advisor: function_search_path_mutable)
ALTER FUNCTION public.prevent_stock_movement_mutation() SET search_path = public;
