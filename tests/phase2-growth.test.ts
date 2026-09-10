import { describe, expect, it } from 'vitest';
import { LocalSeoEngine } from '@/lib/seo/local-seo';
import { locationPathSlug } from '@/lib/seo/location-pages';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('Phase 2 growth — GRW-01 locations', () => {
  it('LocalSeoEngine builds /locations/{city}-{name} slug', () => {
    const page = LocalSeoEngine.buildBranchLandingPage({
      id: 'b1',
      name: 'Main Flagship Store',
      city: 'Colombo',
      address: '42 Galle Road',
      phone: '+94 11 234 5678',
      storeName: 'Grabber',
    });
    expect(page.slug).toBe('/locations/colombo-main-flagship-store');
    expect(locationPathSlug(page)).toBe('colombo-main-flagship-store');
    expect(page.metaTitle).toContain('Colombo');
    expect(page.schema).toBeTruthy();
  });

  it('locations routes and sitemap/robots/middleware are wired', () => {
    expect(fs.existsSync(path.join(root, 'src/app/locations/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/app/locations/[slug]/page.tsx'))).toBe(true);
    expect(read('src/middleware.ts')).toContain("'/locations");
    expect(read('src/app/robots.ts')).toContain('/locations/');
    expect(read('src/app/sitemap.ts')).toContain('listLocationSlugs');
  });
});

describe('Phase 2 growth — GRW-02 in-POS tables', () => {
  it('POS embeds TableServicePanel and TABLES mode', () => {
    const pos = read('src/app/pos/page.tsx');
    expect(pos).toContain('TableServicePanel');
    expect(pos).toContain("'TABLES'");
    expect(pos).toContain('onKotSuccess');
    const panel = read('src/components/restaurant/table-service-panel.tsx');
    expect(panel).toContain('Fire KOT from bag');
  });

  it('shared table-service-panel exists', () => {
    expect(fs.existsSync(path.join(root, 'src/components/restaurant/table-service-panel.tsx'))).toBe(true);
  });
});

describe('Phase 2 growth — GRW-03 wishlist & reviews', () => {
  it('schema and APIs exist', () => {
    const schema = read('src/db/schema.ts');
    expect(schema).toContain('wishlists');
    expect(schema).toContain('productReviews');
    expect(fs.existsSync(path.join(root, 'src/app/api/storefront/wishlist/route.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/app/api/storefront/reviews/route.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'drizzle/migrations/0011_wishlist_reviews.sql'))).toBe(true);
  });

  it('PDP mounts wishlist and reviews', () => {
    const pdp = read('src/app/products/[slug]/page.tsx');
    expect(pdp).toContain('ProductWishlistButton');
    expect(pdp).toContain('ProductReviews');
  });
});
