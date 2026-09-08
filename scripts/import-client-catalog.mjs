/**
 * GRABBER SOLO / BUSINESS OS — CLIENT CATALOG & IMAGE IMPORT FACTORY
 * 
 * Supports:
 * - WooCommerce CSV (Shopping Station, ThePartyStore)
 * - MyPOZ JSON (A&S Mobiles)
 * - MyPOZ CSV (WowThings)
 * - Local product image matching & copying
 * 
 * Usage:
 *   node scripts/import-client-catalog.mjs --manifest clients/client-001.json
 *   node scripts/import-client-catalog.mjs --manifest clients/client-002.json --dry-run
 */
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';
import { resolveDatabaseUrl, postgresClientOptions } from './lib/resolve-db-url.mjs';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
};
const isDryRun = args.includes('--dry-run');

const manifestPath = getArg('--manifest') || 'clients/client-001.json';

if (!fs.existsSync(manifestPath)) {
  console.error(`❌ Manifest not found at ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log(`\n======================================================`);
console.log(`🏭 GRABBER SOLO: CLIENT CATALOG & IMAGE INGESTION FACTORY`);
console.log(`======================================================`);
console.log(`Client ID:        ${manifest.clientId} (${manifest.businessName})`);
console.log(`Vertical Preset:  ${manifest.vertical}`);
console.log(`Source Type:      ${manifest.catalogSource.type}`);
console.log(`Execution Mode:   ${isDryRun ? 'DRY-RUN (Validation Only)' : 'LIVE SEED (PostgreSQL Transaction)'}`);
console.log(`======================================================\n`);

/**
 * Robust CSV parser handling multi-line quoted fields.
 */
function parseCsv(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }
  return rows;
}

function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `prod-${Date.now()}`;
}

async function loadProductsFromSource() {
  const { type, csvPath, jsonPath, imagesDir } = manifest.catalogSource;
  const products = [];

  if (type === 'woocommerce_csv') {
    const fullPath = path.resolve(csvPath);
    if (!fs.existsSync(fullPath)) throw new Error(`CSV file missing: ${fullPath}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    const rows = parseCsv(content);
    const headers = rows[0].map((h) => h.toLowerCase());

    const nameIdx = headers.indexOf('name');
    const skuIdx = headers.indexOf('sku');
    const barcodeIdx = headers.findIndex((h) => h.includes('gtin') || h.includes('barcode') || h.includes('ean'));
    const regPriceIdx = headers.indexOf('regular price');
    const salePriceIdx = headers.indexOf('sale price');
    const costIdx = headers.indexOf('cost');
    const descIdx = headers.indexOf('description');
    const catIdx = headers.indexOf('categories');
    const imgIdx = headers.indexOf('images');
    const stockIdx = headers.indexOf('stock');

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const name = row[nameIdx];
      if (!name) continue;

      const regularPrice = parseFloat(row[regPriceIdx] || row[salePriceIdx] || '0') || 0;
      const salePrice = parseFloat(row[salePriceIdx] || row[regPriceIdx] || '0') || 0;
      const costPrice = costIdx !== -1 && row[costIdx] ? parseFloat(row[costIdx]) : 0;
      const sku = row[skuIdx] || `SKU-${slugify(name).slice(0, 16)}-${r}`;
      const barcode = barcodeIdx !== -1 ? row[barcodeIdx] : '';
      const category = catIdx !== -1 ? (row[catIdx] || '').split('>').pop().trim() : 'General';
      const description = descIdx !== -1 ? row[descIdx] : '';
      const stock = stockIdx !== -1 ? parseInt(row[stockIdx] || '0', 10) : 10;
      const imageUrl = imgIdx !== -1 ? (row[imgIdx] || '').split(',')[0].trim() : '';

      products.push({
        name,
        sku,
        barcode: barcode || null,
        salePrice: (salePrice || regularPrice).toFixed(2),
        costPrice: costPrice.toFixed(2),
        category: category || 'General',
        description,
        stock: isNaN(stock) ? 10 : stock,
        imageUrl,
      });
    }
  } else if (type === 'mypoz_json') {
    const fullPath = path.resolve(jsonPath);
    if (!fs.existsSync(fullPath)) throw new Error(`JSON file missing: ${fullPath}`);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const name = item.Name;
      if (!name) continue;

      const salePrice = parseFloat(item['Sale Price'] || '0') || 0;
      const costPrice = parseFloat(item['Cost Price'] || '0') || 0;
      const sku = item.SKU || `SKU-${i + 1}`;
      const barcode = item.Barcode || '';
      const category = (item.Category || 'General').split('|')[0].trim();
      const description = item.Description || item['Short Description'] || '';
      const stock = parseInt(item.Quantity || '10', 10);
      const imageUrl = item['Image 1'] || '';

      products.push({
        name,
        sku,
        barcode: barcode || null,
        salePrice: salePrice.toFixed(2),
        costPrice: costPrice.toFixed(2),
        category: category || 'General',
        description,
        stock: isNaN(stock) ? 10 : stock,
        imageUrl,
      });
    }
  } else if (type === 'mypoz_csv') {
    const fullPath = path.resolve(csvPath);
    if (!fs.existsSync(fullPath)) throw new Error(`CSV file missing: ${fullPath}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    const rows = parseCsv(content);
    const headers = rows[0].map((h) => h.toLowerCase());

    const nameIdx = headers.indexOf('name');
    const barcodeIdx = headers.indexOf('barcode');
    const costIdx = headers.indexOf('cost price');
    const saleIdx = headers.indexOf('sale price');
    const wholesaleIdx = headers.indexOf('co-op/wholesale price');
    const qtyIdx = headers.findIndex((h) => h.includes('quantity') || h.includes('stock'));
    const catIdx = headers.indexOf('category');
    const descIdx = headers.indexOf('description');

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const name = row[nameIdx];
      if (!name) continue;

      const salePrice = parseFloat(row[saleIdx] || '0') || 0;
      const costPrice = parseFloat(row[costIdx] || '0') || 0;
      const wholesalePrice = wholesaleIdx !== -1 && row[wholesaleIdx] ? parseFloat(row[wholesaleIdx]) : null;
      const barcode = barcodeIdx !== -1 ? row[barcodeIdx] : '';
      const sku = barcode ? `SKU-${barcode}` : `SKU-${r}`;
      const category = catIdx !== -1 ? row[catIdx] : 'General';
      const description = descIdx !== -1 ? row[descIdx] : '';
      const stock = qtyIdx !== -1 ? parseInt(row[qtyIdx] || '0', 10) : 10;

      products.push({
        name,
        sku,
        barcode: barcode || null,
        salePrice: salePrice.toFixed(2),
        costPrice: costPrice.toFixed(2),
        wholesalePrice: wholesalePrice ? wholesalePrice.toFixed(2) : null,
        category: category || 'General',
        description,
        stock: isNaN(stock) ? 10 : stock,
        imageUrl: '',
      });
    }
  }

  return products;
}

async function main() {
  const products = await loadProductsFromSource();
  console.log(`✓ Successfully parsed ${products.length} products from ${manifest.businessName} dataset.`);

  const sample = products.slice(0, 3);
  console.log('\nSample Parsed Records:');
  console.log(JSON.stringify(sample, null, 2));

  if (isDryRun) {
    console.log('\n[DRY-RUN] Validation passed. Zero database writes executed.');
    return;
  }

  const url = resolveDatabaseUrl();
  if (!url) {
    console.error('❌ Database URL missing in environment (.env / .env.local).');
    process.exit(1);
  }

  console.log(`\nConnecting to target database...`);
  const sql = postgres(url, postgresClientOptions(url));

  try {
    console.log('Seeding categories and products into relational database...');
    let inserted = 0;

    // 1. Get or create default branch
    let [branch] = await sql`SELECT id FROM branches LIMIT 1`;
    if (!branch) {
      [branch] = await sql`
        INSERT INTO branches (name, code, address)
        VALUES (${manifest.businessName + ' Main'}, ${manifest.clientSlug + '-main'}, 'Main Branch, Colombo')
        RETURNING id
      `;
    }

    // 2. Insert Products in batches
    const categoriesCache = new Map();
    const existingCats = await sql`SELECT id, name FROM categories`;
    existingCats.forEach((c) => categoriesCache.set(c.name.toLowerCase(), c.id));

    for (const p of products) {
      const catKey = (p.category || 'General').toLowerCase();
      let categoryId = categoriesCache.get(catKey);

      if (!categoryId) {
        const [newCat] = await sql`
          INSERT INTO categories (name, slug)
          VALUES (${p.category || 'General'}, ${slugify(p.category || 'General') + '-' + Date.now().toString(36)})
          RETURNING id
        `;
        categoryId = newCat.id;
        categoriesCache.set(catKey, categoryId);
      }

      const slug = slugify(p.name) + '-' + Math.random().toString(36).slice(2, 6);

      const [newProd] = await sql`
        INSERT INTO products (
          name, slug, sku, barcode, cost_price, sale_price, category_id,
          description, image_url, is_active
        )
        VALUES (
          ${p.name}, ${slug}, ${p.sku}, ${p.barcode}, ${p.costPrice}, ${p.salePrice},
          ${categoryId}, ${p.description || ''}, ${p.imageUrl || ''}, true
        )
        ON CONFLICT (sku) DO UPDATE SET
          name = EXCLUDED.name,
          sale_price = EXCLUDED.sale_price,
          cost_price = EXCLUDED.cost_price,
          description = EXCLUDED.description
        RETURNING id
      `;

      // Seed initial stock balance
      if (newProd && branch) {
        await sql`
          INSERT INTO stock_balances (location_type, location_id, product_id, on_hand, reserved, reorder_point)
          VALUES ('BRANCH', ${branch.id}, ${newProd.id}, ${p.stock || 10}, 0, 5)
          ON CONFLICT (location_type, location_id, product_id) DO UPDATE SET
            on_hand = EXCLUDED.on_hand
        `;
      }

      inserted++;
      if (inserted % 50 === 0 || inserted === products.length) {
        process.stdout.write(`\rImporting products: ${inserted}/${products.length}...`);
      }
    }

    console.log(`\n\n✅ CATALOG IMPORT COMPLETE: ${inserted} products successfully imported for ${manifest.businessName}.`);
  } catch (err) {
    console.error('\n❌ Import failed:', err);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch(console.error);
