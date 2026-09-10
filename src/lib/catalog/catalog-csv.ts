/** Shared CSV column schema for product import/export. */
export const PRODUCT_CSV_HEADERS = [
  'Name',
  'Category',
  'SKU',
  'Barcode',
  'CostPrice',
  'SalePrice',
  'InitialStock',
  'VariantName',
  'Images',
  'Description',
] as const;

export const MAX_PRODUCT_CSV_BYTES = 10 * 1024 * 1024; // 10 MB

export function escapeCsvField(value: string | number | null | undefined, key?: string): string {
  if (value == null) return '';
  const s = String(value).trim();

  // Protect long numeric barcodes from Excel scientific notation (e.g. 8.90123E+13)
  if (key === 'Barcode' && /^\d{8,25}$/.test(s)) {
    return `="${s}"`;
  }

  if (/[",\n\r]/.test(s)) {
    // Sanitize newlines to prevent broken rows in Excel
    const sanitized = s.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildProductCsv(rows: Record<(typeof PRODUCT_CSV_HEADERS)[number], string | number>[]): string {
  const header = PRODUCT_CSV_HEADERS.join(',');
  const body = rows.map((row) =>
    PRODUCT_CSV_HEADERS.map((h) => escapeCsvField(row[h], h)).join(','),
  );
  return [header, ...body].join('\n');
}

export function assertCsvSize(csvText: string): void {
  const bytes = new TextEncoder().encode(csvText).length;
  if (bytes > MAX_PRODUCT_CSV_BYTES) {
    throw new Error(`CSV exceeds ${MAX_PRODUCT_CSV_BYTES / (1024 * 1024)} MB limit`);
  }
  if (!csvText.trim()) {
    throw new Error('CSV file is empty');
  }
}
