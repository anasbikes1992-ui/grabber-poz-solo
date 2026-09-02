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
] as const;

export const MAX_PRODUCT_CSV_BYTES = 5 * 1024 * 1024; // 5 MB

export function escapeCsvField(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildProductCsv(rows: Record<(typeof PRODUCT_CSV_HEADERS)[number], string | number>[]): string {
  const header = PRODUCT_CSV_HEADERS.join(',');
  const body = rows.map((row) =>
    PRODUCT_CSV_HEADERS.map((h) => escapeCsvField(row[h])).join(','),
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
