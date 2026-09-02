import fs from 'fs';
import path from 'path';

/**
 * GRABBER BUSINESS OS — PRODUCTION SEED & CATALOG COMPILER
 * Compiles client catalogs from CSV + standard multi-vertical demo seed.
 * Export Excel to CSV first (see /products/import template columns).
 */

console.log('🚀 Generating Production Catalogs & Database Seeds...');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function loadCsvRecords(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    console.warn(`⚠ Skipped missing catalog: ${filePath}`);
    return { headers: [], rows: [] };
  }
  const text = fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });
    return row;
  });
  return { headers, rows };
}

// 1. Wowthings Catalog Compiler (CSV export of wow_products_with_images.xlsx)
const wowCsvPath = 'excel/wow_products_with_images.csv';
const { rows: wowData } = loadCsvRecords(wowCsvPath);
console.log(`✓ Loaded Wowthings: ${wowData.length} records`);

let wowSql = `-- =====================================================\n`;
wowSql += `-- GRABBER BUSINESS OS: WOWTHINGS.LK CATALOG SEED\n`;
wowSql += `-- Total Products: ${wowData.length}\n`;
wowSql += `-- =====================================================\n\n`;

for (const row of wowData) {
  const name = (row['Name'] || 'Unnamed Product').toString().trim().replace(/'/g, "''");
  const barcode = (row['Barcode'] || `NS-${Date.now()}`).toString().trim();
  const sku = barcode;
  const category = (row['Category'] || 'Fashion & Apparel').toString().trim().replace(/'/g, "''");
  const salePrice = parseFloat(row['Sale Price'] || row['SalePrice']) || 0;
  const costPrice = parseFloat(row['Cost Price'] || row['CostPrice']) || Math.round(salePrice * 0.65);
  const stock = parseInt(row['Quantity/Stock'] || row['InitialStock'] || row['Stock'], 10) || 15;
  const imageUrl = row['Image Links']
    ? row['Image Links'].toString().trim()
    : `https://sauzjjbkfyhfntcitpuz.supabase.co/storage/v1/object/public/products/${barcode}.jpg`;

  if (name && salePrice > 0) {
    wowSql += `INSERT INTO public.products (sku, barcode, name, category, base_cost, sale_price, on_hand, image_url) VALUES ('${sku}', '${barcode}', '${name}', '${category}', ${costPrice}, ${salePrice}, ${stock}, '${imageUrl}') ON CONFLICT (sku) DO UPDATE SET sale_price = EXCLUDED.sale_price, on_hand = EXCLUDED.on_hand;\n`;
  }
}

if (wowData.length > 0) {
  fs.writeFileSync('drizzle/seed_wowthings_catalog.sql', wowSql);
  console.log('✓ Generated drizzle/seed_wowthings_catalog.sql');
}

// 2. Shopping Station Catalog Compiler
const ssCsv = fs.readFileSync('excel/Shopping Station Products data.csv', 'utf8');
const ssLines = ssCsv.split('\n').filter(Boolean);
console.log(`✓ Loaded Shopping Station: ${ssLines.length - 1} records`);

let ssSql = `-- =====================================================\n`;
ssSql += `-- GRABBER BUSINESS OS: SHOPPING STATION CATALOG SEED\n`;
ssSql += `-- Total Products: ${ssLines.length - 1}\n`;
ssSql += `-- =====================================================\n\n`;

let ssCount = 0;
for (let i = 1; i < ssLines.length; i++) {
  const cols = ssLines[i].split(',');
  if (cols.length > 5) {
    const id = cols[0]?.replace(/"/g, '').trim();
    const sku = cols[2]?.replace(/"/g, '').trim() || `SS-${id}`;
    const name = cols[4]?.replace(/"/g, '').trim().replace(/'/g, "''");
    const regularPrice = parseFloat(cols[26]?.replace(/"/g, '') || '0') || 0;
    const costPrice = parseFloat(cols[40]?.replace(/"/g, '') || '0') || Math.round(regularPrice * 0.65);
    const category = (cols[27]?.replace(/"/g, '').split('>')[0]?.trim() || 'Electronics & Mobile').replace(/'/g, "''");

    if (name && regularPrice > 0) {
      ssCount++;
      const barcode = sku;
      const imageUrl = `https://sauzjjbkfyhfntcitpuz.supabase.co/storage/v1/object/public/products/${sku}.jpg`;
      ssSql += `INSERT INTO public.products (sku, barcode, name, category, base_cost, sale_price, on_hand, image_url) VALUES ('${sku}', '${barcode}', '${name}', '${category}', ${costPrice}, ${regularPrice}, 10, '${imageUrl}') ON CONFLICT (sku) DO UPDATE SET sale_price = EXCLUDED.sale_price, on_hand = EXCLUDED.on_hand;\n`;
    }
  }
}

fs.writeFileSync('drizzle/seed_shopping_station_catalog.sql', ssSql);
console.log(`✓ Generated drizzle/seed_shopping_station_catalog.sql (${ssCount} products)`);

// 3. Master Multi-Vertical Demo Seed
let masterSql = `-- =====================================================\n`;
masterSql += `-- GRABBER BUSINESS OS: MASTER COMPLETE MULTI-VERTICAL SEED\n`;
masterSql += `-- Users, Branches, Chart of Accounts, Tax Profiles, POS Register\n`;
masterSql += `-- =====================================================\n\n`;

masterSql += `-- 1. Branches & Warehouses\n`;
masterSql += `INSERT INTO public.branches (id, name, code, is_warehouse, address, phone) VALUES\n`;
masterSql += `  ('br_colombo_main', 'Colombo Main Flagship Store', 'CMB-01', false, '124 Galle Road, Colombo 03', '+94 11 234 5678'),\n`;
masterSql += `  ('br_kandy_mall', 'Kandy City Center Branch', 'KCC-02', false, 'Level 2, KCC, Kandy', '+94 81 223 4455'),\n`;
masterSql += `  ('wh_central_colombo', 'Central Logistics Hub', 'LOG-WH01', true, '45 Orugodawatta Logistics Park, Colombo', '+94 11 987 6543')\n`;
masterSql += `ON CONFLICT (id) DO NOTHING;\n\n`;

masterSql += `-- 2. Tax Profiles & Rates (Sri Lanka Standard 18% VAT)\n`;
masterSql += `INSERT INTO public.tax_profiles (id, code, name, default_rate_percentage) VALUES\n`;
masterSql += `  ('tax_standard_vat', 'VAT_18', 'Sri Lanka Standard VAT 18%', 18.00),\n`;
masterSql += `  ('tax_exempt', 'EXEMPT', 'Tax Exempted Goods', 0.00)\n`;
masterSql += `ON CONFLICT (id) DO NOTHING;\n\n`;

masterSql += `-- 3. POS Registers & Terminals\n`;
masterSql += `INSERT INTO public.registers (id, branch_id, name, code, is_active) VALUES\n`;
masterSql += `  ('reg_cmb_01', 'br_colombo_main', 'Register 01 (Main Counter)', 'REG-01', true),\n`;
masterSql += `  ('reg_cmb_02', 'br_colombo_main', 'Register 02 (Express Counter)', 'REG-02', true),\n`;
masterSql += `  ('reg_kcc_01', 'br_kandy_mall', 'KCC Counter 01', 'KCC-REG-01', true)\n`;
masterSql += `ON CONFLICT (id) DO NOTHING;\n\n`;

masterSql += `-- 4. Demo Customers (Polim Potha AR Accounts)\n`;
masterSql += `INSERT INTO public.customers (id, name, phone, nic, credit_limit, current_balance, loyalty_points) VALUES\n`;
masterSql += `  ('cust_sarath_perera', 'Sarath Perera', '+94771234567', '198512345678', 50000.00, 0.00, 250),\n`;
masterSql += `  ('cust_nimal_silva', 'Nimal Silva', '+94719876543', '199087654321', 25000.00, 0.00, 100),\n`;
masterSql += `  ('cust_anaz_azeez', 'Anaz Azeez (VIP)', '+94779592288', '199200000000', 200000.00, 0.00, 1200)\n`;
masterSql += `ON CONFLICT (id) DO NOTHING;\n\n`;

masterSql += `-- 5. Demo Suppliers\n`;
masterSql += `INSERT INTO public.suppliers (id, name, contact_person, phone, email, payment_terms_days) VALUES\n`;
masterSql += `  ('sup_textiles_ltd', 'Lanka Textiles & Garments Ltd', 'Mr. D. Bandara', '+94112500100', 'orders@lankatextiles.lk', 30),\n`;
masterSql += `  ('sup_tech_dist', 'Colombo Tech Distributors Pvt Ltd', 'Ms. K. Fernando', '+94112600200', 'b2b@colombotech.lk', 14)\n`;
masterSql += `ON CONFLICT (id) DO NOTHING;\n\n`;

fs.writeFileSync('drizzle/seed_master_demo_catalog.sql', masterSql);
console.log('✓ Generated drizzle/seed_master_demo_catalog.sql');
console.log('\n🎉 ALL PRODUCTION SEEDS COMPILED SUCCESSFULLY!');
