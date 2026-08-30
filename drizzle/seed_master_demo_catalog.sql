-- =====================================================
-- GRABBER BUSINESS OS: MASTER COMPLETE MULTI-VERTICAL SEED
-- Users, Branches, Chart of Accounts, Tax Profiles, POS Register
-- =====================================================

-- 1. Branches & Warehouses
INSERT INTO public.branches (id, name, code, is_warehouse, address, phone) VALUES
  ('br_colombo_main', 'Colombo Main Flagship Store', 'CMB-01', false, '124 Galle Road, Colombo 03', '+94 11 234 5678'),
  ('br_kandy_mall', 'Kandy City Center Branch', 'KCC-02', false, 'Level 2, KCC, Kandy', '+94 81 223 4455'),
  ('wh_central_colombo', 'Central Logistics Hub', 'LOG-WH01', true, '45 Orugodawatta Logistics Park, Colombo', '+94 11 987 6543')
ON CONFLICT (id) DO NOTHING;

-- 2. Tax Profiles & Rates (Sri Lanka Standard 18% VAT)
INSERT INTO public.tax_profiles (id, code, name, default_rate_percentage) VALUES
  ('tax_standard_vat', 'VAT_18', 'Sri Lanka Standard VAT 18%', 18.00),
  ('tax_exempt', 'EXEMPT', 'Tax Exempted Goods', 0.00)
ON CONFLICT (id) DO NOTHING;

-- 3. POS Registers & Terminals
INSERT INTO public.registers (id, branch_id, name, code, is_active) VALUES
  ('reg_cmb_01', 'br_colombo_main', 'Register 01 (Main Counter)', 'REG-01', true),
  ('reg_cmb_02', 'br_colombo_main', 'Register 02 (Express Counter)', 'REG-02', true),
  ('reg_kcc_01', 'br_kandy_mall', 'KCC Counter 01', 'KCC-REG-01', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Demo Customers (Polim Potha AR Accounts)
INSERT INTO public.customers (id, name, phone, nic, credit_limit, current_balance, loyalty_points) VALUES
  ('cust_sarath_perera', 'Sarath Perera', '+94771234567', '198512345678', 50000.00, 0.00, 250),
  ('cust_nimal_silva', 'Nimal Silva', '+94719876543', '199087654321', 25000.00, 0.00, 100),
  ('cust_anaz_azeez', 'Anaz Azeez (VIP)', '+94779592288', '199200000000', 200000.00, 0.00, 1200)
ON CONFLICT (id) DO NOTHING;

-- 5. Demo Suppliers
INSERT INTO public.suppliers (id, name, contact_person, phone, email, payment_terms_days) VALUES
  ('sup_textiles_ltd', 'Lanka Textiles & Garments Ltd', 'Mr. D. Bandara', '+94112500100', 'orders@lankatextiles.lk', 30),
  ('sup_tech_dist', 'Colombo Tech Distributors Pvt Ltd', 'Ms. K. Fernando', '+94112600200', 'b2b@colombotech.lk', 14)
ON CONFLICT (id) DO NOTHING;

