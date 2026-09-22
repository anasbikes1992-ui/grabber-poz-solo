/**
 * GRABBER SOLO — Client asset preparation and catalog QA.
 *
 * Copies local product images into public/uploads (gitignored) and writes a
 * deterministic report showing CSV rows, SKU duplicates, category inference,
 * and product-name-to-image matching quality.
 *
 * Usage:
 *   node scripts/prepare-client-assets.mjs --manifest clients/client-002.json
 *   node scripts/prepare-client-assets.mjs --manifest clients/client-002.json --dry-run
 */
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
};

const manifestPath = getArg('--manifest') || 'clients/client-002.json';
const dryRun = args.includes('--dry-run');

if (!fs.existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const source = manifest.catalogSource || {};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i++;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((value) => value.trim())) rows.push(row);
  }
  return rows;
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

function imageMatch(productName, imageMap) {
  const key = normalizeName(productName);
  if (imageMap.has(key)) return { mode: 'exact', fileName: imageMap.get(key) };
  let best = '';
  let bestScore = 0;
  for (const [imageKey, fileName] of imageMap.entries()) {
    const score = imageKey.includes(key) ? key.length : key.includes(imageKey) ? imageKey.length : 0;
    if (score > bestScore) {
      best = fileName;
      bestScore = score;
    }
  }
  const threshold = Math.min(18, Math.max(8, key.length * 0.8));
  return bestScore >= threshold ? { mode: 'fuzzy', fileName: best } : { mode: 'missing', fileName: '' };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const csvPath = path.resolve(source.csvPath);
const imagesDir = path.resolve(source.imagesDir);
const publicImagesDir = path.resolve(source.publicImagesDir || `public/uploads/clients/${manifest.clientSlug}/products`);
const reportDir = path.resolve('reports/client_assets');
ensureDir(reportDir);

const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const headers = rows[0].map((h) => h.trim());
const records = rows.slice(1);
const nameIdx = headers.findIndex((h) => h.toLowerCase() === 'name');
const skuIdx = headers.findIndex((h) => h.toLowerCase() === 'sku');
const catIdx = headers.findIndex((h) => h.toLowerCase() === 'categories');

const imageMap = new Map();
for (const fileName of fs.readdirSync(imagesDir)) {
  if (!/\.(jpe?g|png|webp)$/i.test(fileName)) continue;
  const key = normalizeName(fileName);
  if (!imageMap.has(key)) imageMap.set(key, fileName);
}

const skuCounts = new Map();
const categoryCounts = new Map();
const missingImages = [];
let exact = 0;
let fuzzy = 0;
let copied = 0;

if (!dryRun) ensureDir(publicImagesDir);

for (const row of records) {
  const name = row[nameIdx]?.trim();
  if (!name) continue;
  const sku = row[skuIdx]?.trim();
  if (sku) skuCounts.set(sku, (skuCounts.get(sku) || 0) + 1);
  const rawCategory = row[catIdx]?.split('>').pop()?.trim() || 'Uncategorized';
  const category = source.inferCategories ? inferCategory(name, rawCategory) : rawCategory;
  categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);

  const match = imageMatch(name, imageMap);
  if (match.mode === 'exact') exact++;
  if (match.mode === 'fuzzy') fuzzy++;
  if (match.mode === 'missing') {
    missingImages.push(name);
    continue;
  }

  if (!dryRun) {
    const src = path.join(imagesDir, match.fileName);
    const dest = path.join(publicImagesDir, match.fileName);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      copied++;
    }
  }
}

const duplicateSkus = Array.from(skuCounts.entries()).filter(([, count]) => count > 1);
const report = {
  clientId: manifest.clientId,
  businessName: manifest.businessName,
  csvPath,
  imagesDir,
  publicImagesDir,
  dryRun,
  productRows: records.length,
  sourceImages: imageMap.size,
  imageMatches: { exact, fuzzy, missing: missingImages.length },
  duplicateSkuCount: duplicateSkus.length,
  duplicateSkus: duplicateSkus.slice(0, 50).map(([sku, count]) => ({ sku, count })),
  topCategories: Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([category, count]) => ({ category, count })),
  missingImages: missingImages.slice(0, 50),
  copied,
  generatedAt: new Date().toISOString(),
};

const outPath = path.join(reportDir, `${manifest.clientSlug}_asset_report.json`);
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
console.log(`\nReport written: ${outPath}`);
