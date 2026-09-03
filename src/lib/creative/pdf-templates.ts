export type PdfTemplateKind =
  | 'PRICE_LIST'
  | 'PRODUCT_CATALOG'
  | 'FLYER'
  | 'RECEIPT'
  | 'QUOTATION'
  | 'BROCHURE'
  | 'PROMO';

export const PDF_TEMPLATES: { id: PdfTemplateKind; label: string; description: string }[] = [
  { id: 'PRICE_LIST', label: 'Price list', description: 'Live sale prices from inventory' },
  { id: 'PRODUCT_CATALOG', label: 'Product catalog', description: 'SKU + price table for sharing' },
  { id: 'FLYER', label: 'Flyer', description: 'Promotional one-pager with CTA' },
  { id: 'QUOTATION', label: 'Quotation', description: 'Branded quote layout from products' },
  { id: 'RECEIPT', label: 'Receipt', description: 'Simple receipt-style PDF' },
  { id: 'BROCHURE', label: 'Brochure', description: 'Multi-section product brochure' },
  { id: 'PROMO', label: 'Promotional PDF', description: 'Offer / discount announcement' },
];
