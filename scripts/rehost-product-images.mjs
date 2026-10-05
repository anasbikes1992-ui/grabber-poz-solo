/**
 * Copy product images hosted on third-party sites into our own Supabase Storage so the catalog
 * does not break when the other site changes or goes away.
 *
 *   node scripts/rehost-product-images.mjs                 # dry run: report only, writes nothing
 *   node scripts/rehost-product-images.mjs --apply         # download, upload, rewrite URLs
 *   node scripts/rehost-product-images.mjs --apply --null-dead   # also clear URLs that 404
 *   --env-file <path>  load a specific env file (e.g. the demo database)
 *   --limit <n>        process at most n images
 *
 * Needs DATABASE_URL (or POSTGRES_URL*), and for --apply NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * Only images with a valid JPEG/PNG/WebP/GIF signature, at most 8MB, are uploaded.
 */
import { randomUUID } from 'crypto';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { resolveDirectDatabaseUrl } from './lib/resolve-db-url.mjs';
import {
  MAX_IMAGE_BYTES,
  externalAttrImages,
  isExternalImageUrl,
  sniffImage,
  summarize,
} from './lib/rehost-images.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : undefined;
};

const envFile = opt('--env-file');
if (envFile) loadEnv({ path: envFile, override: true });
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const APPLY = flag('--apply');
const NULL_DEAD = flag('--null-dead');
const LIMIT = Number(opt('--limit')) > 0 ? Number(opt('--limit')) : Infinity;
const BUCKET = 'products';

const dbUrl = resolveDirectDatabaseUrl();
if (!dbUrl) {
  console.error('No database URL found (DATABASE_URL / POSTGRES_URL).');
  process.exit(1);
}
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (APPLY && (!supabaseUrl || !serviceKey)) {
  console.error('--apply needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 1 });
const cache = new Map(); // source URL -> { status, newUrl }

async function download(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
  if (res.status === 404 || res.status === 410) return { dead: true };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > MAX_IMAGE_BYTES) return { invalid: 'too large' };
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return { invalid: 'empty or too large' };
  const kind = sniffImage(bytes);
  if (!kind) return { invalid: 'not a JPEG/PNG/WebP/GIF' };
  return { bytes, kind };
}

async function upload(bytes, kind) {
  const objectPath = `rehosted/${randomUUID()}.${kind.ext}`;
  const res = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': kind.mime, 'x-upsert': 'false' },
    body: new Blob([new Uint8Array(bytes)], { type: kind.mime }),
  });
  if (!res.ok) throw new Error(`upload failed: HTTP ${res.status}`);
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

/** Resolve one source URL to { status, newUrl? }; results are cached so a shared image is copied once. */
async function process_(url) {
  if (cache.has(url)) return cache.get(url);
  let result;
  try {
    if (!APPLY) {
      result = { status: 'planned' };
    } else {
      const got = await download(url);
      if (got.dead) result = { status: 'dead' };
      else if (got.invalid) result = { status: 'invalid', reason: got.invalid };
      else result = { status: 'rehosted', newUrl: await upload(got.bytes, got.kind) };
    }
  } catch (err) {
    result = { status: 'invalid', reason: err.message };
  }
  cache.set(url, result);
  return result;
}

const results = [];
let budget = LIMIT;

const productRows = await sql`
  SELECT id, slug, image_url FROM products WHERE image_url IS NOT NULL AND image_url <> ''`;
for (const row of productRows) {
  if (!isExternalImageUrl(row.image_url)) continue;
  if (budget-- <= 0) break;
  const r = await process_(row.image_url);
  results.push({ where: `product ${row.slug}`, url: row.image_url, ...r });
  if (!APPLY) continue;
  if (r.status === 'rehosted') {
    await sql`UPDATE products SET image_url = ${r.newUrl}, updated_at = now() WHERE id = ${row.id}`;
  } else if (r.status === 'dead' && NULL_DEAD) {
    await sql`UPDATE products SET image_url = NULL, updated_at = now() WHERE id = ${row.id}`;
  }
}

const variantRows = await sql`SELECT id, product_id, attributes_json FROM product_variants`;
for (const row of variantRows) {
  const found = externalAttrImages(row.attributes_json);
  if (found.length === 0) continue;
  const next = { ...row.attributes_json };
  let changed = false;
  for (const { key, url } of found) {
    if (budget-- <= 0) break;
    const r = await process_(url);
    results.push({ where: `variant ${row.id} (${key})`, url, ...r });
    if (!APPLY) continue;
    if (r.status === 'rehosted') {
      next[key] = r.newUrl;
      changed = true;
    } else if (r.status === 'dead' && NULL_DEAD) {
      delete next[key];
      changed = true;
    }
  }
  if (APPLY && changed) {
    await sql`UPDATE product_variants SET attributes_json = ${sql.json(next)} WHERE id = ${row.id}`;
  }
}

for (const r of results) {
  console.log(`${r.status.padEnd(8)} ${r.where}  ${r.url}${r.newUrl ? `  ->  ${r.newUrl}` : ''}${r.reason ? `  (${r.reason})` : ''}`);
}
const hosts = new Set(results.map((r) => new URL(r.url).hostname));
console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN (nothing written)'}: ${results.length} external image reference(s) from ${hosts.size} host(s): ${[...hosts].join(', ') || '-'}`);
console.log(summarize(results));
if (!APPLY && results.length) console.log('Re-run with --apply to copy them. Add --null-dead to clear links that return 404.');
await sql.end();
