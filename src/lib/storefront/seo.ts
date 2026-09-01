import type { Metadata } from 'next';

export function siteBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.CERTIFY_HTTP_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export function productDescription(input: {
  name: string;
  category?: string | null;
  salePrice: number;
  inStock: boolean;
}) {
  const cat = input.category ? `${input.category} · ` : '';
  const avail = input.inStock ? 'In stock' : 'Out of stock';
  return `${cat}${input.name} — LKR ${input.salePrice.toLocaleString('en-LK')}. ${avail}. Shop online with Grabber.`;
}

export function buildProductMetadata(input: {
  name: string;
  slug: string;
  description: string;
  salePrice: number;
  imageUrl?: string | null;
}): Metadata {
  const url = `${siteBaseUrl()}/products/${input.slug}`;
  return {
    title: `${input.name} | Grabber Store`,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: input.name,
      description: input.description,
      url,
      type: 'website',
      images: input.imageUrl ? [{ url: input.imageUrl, alt: input.name }] : undefined,
    },
    twitter: {
      card: input.imageUrl ? 'summary_large_image' : 'summary',
      title: input.name,
      description: input.description,
      images: input.imageUrl ? [input.imageUrl] : undefined,
    },
  };
}

export function productJsonLd(input: {
  name: string;
  slug: string;
  sku: string;
  description: string;
  salePrice: number;
  imageUrl?: string | null;
  inStock: boolean;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    sku: input.sku,
    description: input.description,
    image: input.imageUrl || undefined,
    url: `${siteBaseUrl()}/products/${input.slug}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'LKR',
      price: input.salePrice.toFixed(2),
      availability: input.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${siteBaseUrl()}/products/${input.slug}`,
    },
  };
}
