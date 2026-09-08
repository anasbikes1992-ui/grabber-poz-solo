/**
 * GRABBER BUSINESS OS — SEO CONTENT FACTORY
 * Generates structured product descriptions, buying guide outlines, FAQs, and valid JSON-LD schemas.
 */

export interface ProductSeoContentBundle {
  seoTitle: string;
  metaDescription: string;
  h1: string;
  featureBullets: string[];
  faqs: Array<{ question: string; answer: string }>;
  structuredDataJsonLd: Record<string, unknown>;
}

export class SeoContentFactory {
  public static generateProductBundle(product: {
    name: string;
    category?: string;
    brand?: string;
    price: number;
    currency?: string;
    sku?: string;
    availability?: 'InStock' | 'OutOfStock';
    description?: string;
  }): ProductSeoContentBundle {
    const currency = product.currency || 'LKR';
    const brand = product.brand || 'Grabber';
    const title = `${product.name} — Best Price in Sri Lanka | ${brand}`;
    const metaDesc = `Buy genuine ${product.name} online in Sri Lanka at ${currency} ${product.price.toLocaleString()}. Fast islandwide delivery and official warranty from ${brand}.`;

    const faqs = [
      {
        question: `How much is ${product.name} in Sri Lanka?`,
        answer: `${product.name} is priced at ${currency} ${product.price.toLocaleString()} with official warranty and doorstep delivery options.`,
      },
      {
        question: `Do you provide cash on delivery (COD) for ${product.name}?`,
        answer: `Yes, islandwide Cash on Delivery (COD) and secure card payment are available across all districts in Sri Lanka.`,
      },
      {
        question: `Is ${product.name} genuine and covered by warranty?`,
        answer: `All products sold through our official store are 100% genuine and backed by standard service warranty.`,
      },
    ];

    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name,
      description: metaDesc,
      sku: product.sku || `SKU-${product.name.replace(/\s+/g, '-').toUpperCase()}`,
      brand: {
        '@type': 'Brand',
        name: brand,
      },
      offers: {
        '@type': 'Offer',
        url: `https://example.com/products/${encodeURIComponent(product.name)}`,
        priceCurrency: currency,
        price: product.price,
        availability: product.availability === 'OutOfStock' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
    };

    return {
      seoTitle: title,
      metaDescription: metaDesc,
      h1: product.name,
      featureBullets: [
        `Official ${brand} Genuine Product Assurance`,
        `Instant Checkout with Islandwide Delivery`,
        `Transparent Pricing at ${currency} ${product.price.toLocaleString()}`,
        `Dedicated Customer Support & Warranty Coverage`,
      ],
      faqs,
      structuredDataJsonLd: jsonLd,
    };
  }

  public static generateLocalBusinessSchema(branch: {
    name: string;
    address: string;
    city: string;
    phone: string;
    openingHours?: string;
  }): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: branch.name,
      telephone: branch.phone,
      address: {
        '@type': 'PostalAddress',
        streetAddress: branch.address,
        addressLocality: branch.city,
        addressCountry: 'LK',
      },
      openingHours: branch.openingHours || 'Mo-Sa 09:00-19:00',
      priceRange: '$$',
    };
  }
}
