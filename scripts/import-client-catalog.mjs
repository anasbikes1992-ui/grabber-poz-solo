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

function normalizeName(text) {
  return (text || '')
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\.(jpe?g|png|webp)$/i, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function encodeUrlPath(pathname) {
  return pathname
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
    .replace(/^%2F/, '/');
}

function buildLocalImageIndex(imagesDir) {
  const index = new Map();
  if (!imagesDir) return index;
  const fullDir = path.resolve(imagesDir);
  if (!fs.existsSync(fullDir)) return index;

  for (const fileName of fs.readdirSync(fullDir)) {
    if (!/\.(jpe?g|png|webp)$/i.test(fileName)) continue;
    const key = normalizeName(fileName);
    if (!index.has(key)) index.set(key, fileName);
  }
  return index;
}

function resolveLocalImageUrl(productName, imageIndex, publicBaseUrl) {
  const key = normalizeName(productName);
  if (!key || imageIndex.size === 0 || !publicBaseUrl) return '';

  const exact = imageIndex.get(key);
  if (exact) return encodeUrlPath(`${publicBaseUrl.replace(/\/$/, '')}/${exact}`);

  let best = '';
  let bestScore = 0;
  for (const [imageKey, fileName] of imageIndex.entries()) {
    const score =
      imageKey === key
        ? 100
        : imageKey.includes(key)
          ? key.length
          : key.includes(imageKey)
            ? imageKey.length
            : 0;
    if (score > bestScore) {
      best = fileName;
      bestScore = score;
    }
  }

  return bestScore >= Math.min(18, Math.max(8, key.length * 0.8))
    ? encodeUrlPath(`${publicBaseUrl.replace(/\/$/, '')}/${best}`)
    : '';
}

function inferCategory(name, fallback = 'Party Essentials') {
  const text = normalizeName(`${name} ${fallback}`);
  const rules = [
    ['Balloons', /\b(balloon|foil|latex|orbz|bouquet|arch|helium)\b/],
    ['Birthday', /\b(birthday|fabulous|sweet 16|13th|18th|21st|30th|40th|50th|60th|70th|80th)\b/],
    ['Baby Shower', /\b(baby shower|baby boy|baby girl|gender reveal|stroller|1st tooth)\b/],
    ['Tableware', /\b(paper plate|paper cup|napkin|table cover|tablecover|straw|popcorn box)\b/],
    ['Cake & Candles', /\b(cake topper|cup cake|cupcake|candle|sparkler|ice fountain)\b/],
    ['Banners & Backdrops', /\b(banner|bunting|fringe curtain|backdrop|photo booth|props)\b/],
    ['Costumes & Wearables', /\b(mask|wig|sash|tiara|boa|wings|glasses|hat|headband)\b/],
    ['Theme Party Kits', /\b(theme|avengers|barbie|unicorn|batman|among us|mermaid|princess|toy story|baby shark|winnie|tiktok|minecraft|spiderman|superman)\b/],
    ['Seasonal & Halloween', /\b(halloween|ghost|skeleton|spider|witch|vampire|zombie|skull|christmas|santa|reindeer)\b/],
    ['Gift Bags & Wrapping', /\b(gift bag|kraft bag|wine bag|wrapping paper)\b/],
    ['Decorations', /\b(pom pom|lantern|tassel|streamer|confetti|decor|flower|garland)\b/],
  ];
  for (const [category, pattern] of rules) {
    if (pattern.test(text)) return category;
  }
  return fallback && fallback !== 'Uncategorized' ? fallback : 'Party Essentials';
}

function uniqueSku(rawSku, name, rowNumber, seenSkus, dedupeSku) {
  const base = (rawSku || `TPS-${slugify(name).slice(0, 18) || rowNumber}`).toString().trim();
  if (!dedupeSku) return base || `TPS-${rowNumber}`;
  const normalizedBase = base || `TPS-${rowNumber}`;
  const count = seenSkus.get(normalizedBase) || 0;
  seenSkus.set(normalizedBase, count + 1);
  return count === 0 ? normalizedBase : `${normalizedBase}-${String(count + 1).padStart(3, '0')}`;
}

async function loadProductsFromSource() {
  const {
    type,
    csvPath,
    jsonPath,
    imagesDir,
    publicImagesBaseUrl,
    imageMatchMode,
    inferCategories,
    dedupeSku,
  } = manifest.catalogSource;
  const products = [];
  const imageIndex = imageMatchMode === 'name' ? buildLocalImageIndex(imagesDir) : new Map();
  const seenSkus = new Map();

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
    const defaultStock = Number.isFinite(Number(manifest.catalogSource.defaultStock))
      ? Number(manifest.catalogSource.defaultStock)
      : 10;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const name = row[nameIdx];
      if (!name) continue;

      const regularPrice = parseFloat(row[regPriceIdx] || row[salePriceIdx] || '0') || 0;
      const salePrice = parseFloat(row[salePriceIdx] || row[regPriceIdx] || '0') || 0;
      const costPrice = costIdx !== -1 && row[costIdx] ? parseFloat(row[costIdx]) : 0;
      const sku = uniqueSku(row[skuIdx], name, r, seenSkus, Boolean(dedupeSku));
      const barcode = barcodeIdx !== -1 ? row[barcodeIdx] : '';
      const rawCategory = catIdx !== -1 ? (row[catIdx] || '').split('>').pop().trim() : 'General';
      const category = inferCategories ? inferCategory(name, rawCategory) : rawCategory;
      const description = descIdx !== -1 ? row[descIdx] : '';
      const rawStock = stockIdx !== -1 ? String(row[stockIdx] || '').trim() : '';
      const stock = rawStock ? parseInt(rawStock, 10) : defaultStock;
      const csvImageUrl = imgIdx !== -1 ? (row[imgIdx] || '').split(',')[0].trim() : '';
      const localImageUrl = resolveLocalImageUrl(name, imageIndex, publicImagesBaseUrl);
      const imageUrl = localImageUrl || csvImageUrl;

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
          category_id = EXCLUDED.category_id,
          description = EXCLUDED.description,
          image_url = EXCLUDED.image_url,
          is_active = true
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
