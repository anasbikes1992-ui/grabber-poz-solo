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

export function categoryDescription(input: {
  name: string;
  productCount: number;
}) {
  return `Browse our collection of ${input.name}. Discover ${input.productCount} top-rated products with fast delivery and best prices in Sri Lanka.`;
}

export function buildCategoryMetadata(input: {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string | null;
  productCount?: number;
}): Metadata {
  const url = `${siteBaseUrl()}/categories/${input.slug}`;
  const desc =
    input.description ||
    categoryDescription({
      name: input.name,
      productCount: input.productCount ?? 0,
    });

  return {
    title: `${input.name} Collection | Grabber Store`,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: `${input.name} | Grabber Store`,
      description: desc,
      url,
      type: 'website',
      images: input.imageUrl ? [{ url: input.imageUrl, alt: input.name }] : undefined,
    },
    twitter: {
      card: input.imageUrl ? 'summary_large_image' : 'summary',
      title: `${input.name} | Grabber Store`,
      description: desc,
      images: input.imageUrl ? [input.imageUrl] : undefined,
    },
  };
}

export function categoryJsonLd(input: {
  name: string;
  slug: string;
  description?: string;
  products: Array<{
    name: string;
    slug: string;
    salePrice: number;
    imageUrl?: string | null;
  }>;
}) {
  const url = `${siteBaseUrl()}/categories/${input.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    description: input.description || `Browse ${input.name} catalog`,
    url,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: input.products.length,
      itemListElement: input.products.map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: p.name,
        url: `${siteBaseUrl()}/products/${p.slug}`,
        image: p.imageUrl || undefined,
      })),
    },
  };
}
