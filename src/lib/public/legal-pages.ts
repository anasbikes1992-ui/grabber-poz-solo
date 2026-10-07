import type { Metadata } from 'next';
import { DEFAULT_OG_IMAGE, absoluteUrl, siteBaseUrl } from '@/lib/storefront/seo';

export type LegalPageDefinition = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  updated: string;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
};

export const PUBLIC_LEGAL_ROUTES = [
  '/terms',
  '/privacy',
  '/delivery-policy',
  '/refund-policy',
  '/contact',
] as const;

export const legalPages: Record<string, LegalPageDefinition> = {
  terms: {
    slug: 'terms',
    title: 'Terms and Conditions',
    eyebrow: 'Company and Store Terms',
    description:
      'Terms for using Grabber POZ company pages, demos, storefronts, checkout, and client onboarding services.',
    updated: 'October 7, 2026',
    sections: [
      {
        heading: 'Scope',
        body: [
          'These terms apply to Grabber POZ public company pages, demo storefronts, customer checkout flows, and client onboarding communications.',
          'Each shop using Grabber POZ runs its own separate system and database. Merchant-specific sales terms may be shown on that merchant storefront or receipt.',
        ],
      },
      {
        heading: 'Use of the platform',
        body: [
          'You agree to provide accurate contact, order, delivery, and payment information when submitting inquiries or placing orders.',
          'Staff dashboards, POS, inventory, finance, and company admin areas are restricted to authorized users only.',
        ],
      },
      {
        heading: 'Orders and payments',
        body: [
          'Storefront orders may support cash on delivery, online payment gateways, or other configured payment methods depending on the merchant.',
          'Order confirmation, delivery, cancellation, and return decisions are handled by the operating merchant according to its published policy and applicable law.',
        ],
      },
      {
        heading: 'Service availability',
        body: [
          'Grabber POZ aims to keep the service reliable, but scheduled maintenance, provider outages, internet failures, or payment/courier provider issues may affect availability.',
          'Business-critical users should keep their agreed backup, support, and disaster-recovery procedures current.',
        ],
      },
      {
        heading: 'Contact',
        body: [
          'For company inquiries, demos, implementation scope, and client management questions, contact Grabber POZ through the inquiry form or WhatsApp link on the contact page.',
        ],
      },
    ],
  },
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    eyebrow: 'Data Protection',
    description:
      'How Grabber POZ handles company inquiries, store customer details, order data, WhatsApp messages, and operational records.',
    updated: 'October 7, 2026',
    sections: [
      {
        heading: 'Information we collect',
        body: [
          'We collect information submitted through company inquiry forms, storefront checkout, account login, WhatsApp messages, and staff operations.',
          'This may include names, phone numbers, email addresses, delivery addresses, order details, payment status, support notes, and audit records.',
        ],
      },
      {
        heading: 'How information is used',
        body: [
          'Information is used to process inquiries, schedule demos, provision client instances, complete orders, manage delivery, support customers, prevent fraud, and maintain accounting records.',
          'Company lead automation may send WhatsApp notifications to the Grabber sales team and optional replies to prospects when enabled.',
        ],
      },
      {
        heading: 'Client isolation',
        body: [
          'Each client shop gets its own system and its own database, unless a separate written agreement says otherwise.',
          'Grabber POZ does not mix the orders, customers, stock or payments of different shops.',
        ],
      },
      {
        heading: 'Third-party providers',
        body: [
          'Configured providers may include payment gateways, WhatsApp Business Cloud API, courier providers, storage providers, analytics, and monitoring tools.',
          'Only the data needed for the configured workflow is sent to those providers.',
        ],
      },
      {
        heading: 'Retention and requests',
        body: [
          'Operational data is retained as needed for business records, support, security, and legal obligations.',
          'For privacy requests, contact Grabber POZ using the details on the contact page.',
        ],
      },
    ],
  },
  'delivery-policy': {
    slug: 'delivery-policy',
    title: 'Delivery Policy',
    eyebrow: 'Store Delivery',
    description:
      'Delivery, courier, in-house rider, and order tracking guidance for Grabber POZ powered storefronts.',
    updated: 'October 7, 2026',
    sections: [
      {
        heading: 'Delivery methods',
        body: [
          'Storefronts may use courier integrations, in-house riders, manual dispatch, pickup, or cash on delivery depending on the merchant configuration.',
          'Available delivery methods, fees, and service areas may vary by store, branch, product type, and order value.',
        ],
      },
      {
        heading: 'Customer notifications',
        body: [
          'When enabled, customers may receive order, dispatch, repair, or delivery updates by WhatsApp, phone, or email.',
          'In-house rider notifications should include only delivery-relevant details and must not expose internal cost, profit, or staff-only links.',
        ],
      },
      {
        heading: 'Tracking and failed delivery',
        body: [
          'Customers can use the public tracking route when the merchant provides an order number or tracking link.',
          'If a delivery fails because the customer is unreachable or the address is incorrect, the merchant may contact the customer to reschedule or cancel according to its policy.',
        ],
      },
    ],
  },
  'refund-policy': {
    slug: 'refund-policy',
    title: 'Refund and Returns Policy',
    eyebrow: 'Returns and Refunds',
    description:
      'Refund, return, exchange, damaged item, and cash on delivery handling for Grabber POZ powered stores.',
    updated: 'October 7, 2026',
    sections: [
      {
        heading: 'Merchant responsibility',
        body: [
          'Refund and return decisions are handled by the merchant that sold the product or service.',
          'Store-specific return windows, exchange rules, warranty terms, and damaged goods handling may be shown on the storefront, receipt, or invoice.',
        ],
      },
      {
        heading: 'Proof and condition',
        body: [
          'Customers may be asked to provide an order number, receipt, phone number, photos, warranty card, or original packaging.',
          'Refunds may be reduced or declined for used, damaged, incomplete, or non-returnable items where permitted by policy and law.',
        ],
      },
      {
        heading: 'Payment reversal',
        body: [
          'Approved refunds should follow the original payment method where available and should be recorded in the merchant system so stock and accounting records stay correct.',
          'Cash on delivery refunds are handled by the merchant after confirming payment collection and return eligibility.',
        ],
      },
    ],
  },
  contact: {
    slug: 'contact',
    title: 'Contact Grabber POZ',
    eyebrow: 'Sales, Demos, and Support',
    description:
      'Contact Grabber POZ for demos, setup, support, WhatsApp sales and online store questions.',
    updated: 'October 7, 2026',
    sections: [
      {
        heading: 'Sales and demos',
        body: [
          'Use the company inquiry form to request a live walkthrough of the counter POS, stock control, customer credit (Polim Potha), online store, WhatsApp, delivery and reports.',
          'For quick follow-up, use the configured company WhatsApp number when available.',
        ],
      },
      {
        heading: 'Client management',
        body: [
          'Existing clients should use their agreed support channel for production issues, backup/restore requests, domain updates, and provider credential changes.',
          'Credentials should only be shared through the agreed secure channel, never through public forms.',
        ],
      },
      {
        heading: 'Store customers',
        body: [
          'For questions about a specific order, delivery, return, or refund, contact the merchant from whom you purchased.',
          'Grabber POZ provides the software platform; the merchant operates its own store, stock, riders, payments, and customer service.',
        ],
      },
    ],
  },
};

export function getLegalPage(slug: string) {
  const page = legalPages[slug];
  if (!page) throw new Error(`Unknown public legal page: ${slug}`);
  return page;
}

export function buildLegalMetadata(page: LegalPageDefinition): Metadata {
  const base = siteBaseUrl();
  const url = `${base}/${page.slug}`;
  const image = absoluteUrl(DEFAULT_OG_IMAGE, base);
  return {
    title: `${page.title} | Grabber POZ`,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${page.title} | Grabber POZ`,
      description: page.description,
      url,
      siteName: 'Grabber POZ',
      type: 'website',
      images: [{ url: image, alt: `${page.title} - Grabber POZ` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${page.title} | Grabber POZ`,
      description: page.description,
      images: [image],
    },
  };
}

export function legalPageJsonLd(page: LegalPageDefinition) {
  const base = siteBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': page.slug === 'contact' ? 'ContactPage' : 'WebPage',
    name: page.title,
    description: page.description,
    url: `${base}/${page.slug}`,
    dateModified: page.updated,
    publisher: {
      '@type': 'Organization',
      name: 'Grabber POZ',
      url: base,
      logo: `${base}/icon.svg`,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales and customer support',
        areaServed: 'LK',
        availableLanguage: ['English', 'Sinhala', 'Tamil'],
      },
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: base,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: page.title,
          item: `${base}/${page.slug}`,
        },
      ],
    },
  };
}
