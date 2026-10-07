import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Testimonials } from '@/components/company/Testimonials';
import { ButtonLink, buttonClass } from '@/components/company/ui/Button';
import { WhatsAppFloat } from '@/components/company/ui/WhatsAppButton';
import { ProductImage } from '@/components/storefront/ProductImage';
import { approvedLogos, approvedTestimonials, type Testimonial } from '@/lib/company/social-proof';
import { availableMarketingAssets } from '@/lib/company/marketing-assets';
import { buildStorefrontFamilyItems } from '@/lib/storefront/catalog-service';

const quote: Testimonial = { approved: true, quote: 'Billing is fast.', name: 'Nimal', shop: 'ABC Fashion', town: 'Kandy' };

describe('company site: social proof', () => {
  it('renders nothing without approved entries', () => {
    expect(renderToStaticMarkup(createElement(Testimonials))).toBe('');
    expect(renderToStaticMarkup(createElement(Testimonials, { items: [{ ...quote, approved: false }] }))).toBe('');
  });

  it('only approved, complete entries count', () => {
    expect(approvedTestimonials([quote, { ...quote, approved: false }, { ...quote, quote: ' ' }])).toHaveLength(1);
    expect(approvedLogos([{ approved: true, name: 'A', logoUrl: '' }, { approved: true, name: 'B', logoUrl: '/b.png' }])).toHaveLength(1);
  });

  it('renders approved testimonials', () => {
    const html = renderToStaticMarkup(createElement(Testimonials, { items: [quote] }));
    expect(html).toContain('Billing is fast.');
    expect(html).toContain('ABC Fashion');
  });
});

describe('company site: buttons and contact', () => {
  it('every button centres its label', () => {
    for (const v of ['primary', 'secondary', 'ghost'] as const) {
      expect(buttonClass(v)).toMatch(/inline-flex.*items-center.*justify-center.*text-center/);
    }
    const html = renderToStaticMarkup(createElement(ButtonLink, { href: '#contact', children: 'Get a free demo' }));
    expect(html).toContain('justify-center');
    expect(html).toContain('href="#contact"');
  });

  it('WhatsApp button needs a number and prefills the message', () => {
    expect(renderToStaticMarkup(createElement(WhatsAppFloat, { number: '' }))).toBe('');
    const html = renderToStaticMarkup(createElement(WhatsAppFloat, { number: '+94 77 123 4567' }));
    expect(html).toContain('https://wa.me/94771234567?text=');
    expect(html).toContain('Chat on WhatsApp');
  });
});

describe('company site: copy has no shop-owner-hostile jargon', () => {
  const files = [
    'src/components/company/CompanyLanding.tsx',
    'src/components/company/CompanyLandingBelowFold.tsx',
    'src/components/company/Faq.tsx',
    'src/app/pricing/page.tsx',
    'src/components/company/PublicInfoPage.tsx',
    'src/app/contact/page.tsx',
    'src/lib/public/legal-pages.ts',
  ].map((f) => [f, readFileSync(f, 'utf8')] as const);
  const banned = ['COMPANY_SALES_WHATSAPP', 'HMAC', 'SHA256', 'Regression Certified', 'Sandbox', 'Canonical Reconciliation', 'FEFO', 'GRN', 'ESC/POS', 'Business OS', 'Pro demo', 'tenant database', 'Settings Vault', 'single-tenant', 'Jarvis', 'KDS'];

  it.each(files)('%s', (_f, src) => {
    for (const term of banned) expect(src).not.toContain(term);
  });
});

describe('demo store: internal codes and images', () => {
  const product = { id: 'p1', slug: 'cake', name: 'Cake', sku: 'GEN-00017', barcode: null, salePrice: 100, costPrice: 50, imageUrl: null, description: null, categoryId: null };

  it('never exposes the SKU as a shopper-facing variant label', () => {
    const [item] = buildStorefrontFamilyItems({ products: [product], variantsByProduct: new Map(), categoryMap: new Map(), stockMap: new Map() });
    expect(item.variant).toBe('');
    expect(item.variant).not.toContain('GEN-');
  });

  it('shows a placeholder instead of a broken image when there is no photo', () => {
    const html = renderToStaticMarkup(createElement(ProductImage, { src: null, alt: 'Cake', className: 'x' }));
    expect(html).toContain('Photo coming soon');
    expect(html).not.toContain('<img');
  });

  it('renders the photo when a URL exists', () => {
    const html = renderToStaticMarkup(createElement(ProductImage, { src: 'https://cdn.example/a.jpg', alt: 'Cake' }));
    expect(html).toContain('src="https://cdn.example/a.jpg"');
  });
});

describe('company site: screenshots only render when the files exist', () => {
  it('reports exactly the files present', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'mk-'));
    expect(availableMarketingAssets(dir)).toEqual({ pos: false, inventory: false, storefront: false, credit: false });
    writeFileSync(path.join(dir, 'pos-checkout.webp'), 'x');
    expect(availableMarketingAssets(dir)).toMatchObject({ pos: true, inventory: false });
  });
});
