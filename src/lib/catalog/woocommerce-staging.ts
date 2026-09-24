import { createHash } from 'crypto';

export type WooStockStatus = 'unknown' | 'provided' | 'invalid' | 'flagOnly';

export type WooStagedRow = {
  rowIndex: number;
  sourceId: string;
  sourceHash: string;
  type: string;
  title: string;
  rawSku: string;
  internalSku: string;
  parentRaw: string | null;
  regularPrice: number | null;
  salePrice: number | null;
  currentPrice: number | null;
  categories: string[][];
  tags: string[];
  images: string[];
  description: string | null;
  shortDescription: string | null;
  attributes: Record<string, string>;
  publishedInSource: boolean;
  stock: {
    status: WooStockStatus;
    quantity: number | null;
    inStockFlag: boolean | null;
  };
  warnings: string[];
};

export type WooStagedFamily = {
  parent: WooStagedRow;
  children: WooStagedRow[];
};

export type WooStagingSummary = {
  totalRows: number;
  variableParents: number;
  simpleProducts: number;
  childVariations: number;
  orphanChildren: number;
  rowsWithWarnings: number;
  sourceFileHash: string;
};

export type WooStagingResult = {
  rows: WooStagedRow[];
  families: WooStagedFamily[];
  simpleProducts: WooStagedRow[];
  orphanChildren: WooStagedRow[];
  summary: WooStagingSummary;
};

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function parseCsvLine(line: string, delimiter = ','): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }

  out.push(cur.trim());
  return out;
}

function parseCsvRecords(csvText: string, delimiter = ','): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      record.push(cur.trim());
      cur = '';
      continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      record.push(cur.trim());
      cur = '';
      if (record.some((field) => field.length > 0)) {
        records.push(record);
      }
      record = [];
      continue;
    }
    cur += ch;
  }

  record.push(cur.trim());
  if (record.some((field) => field.length > 0)) {
    records.push(record);
  }

  return records;
}

function cleanHeaderKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseAmount(value: string | undefined): number | null {
  const cleaned = (value || '').replace(/[^0-9.-]/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseBool(value: string | undefined): boolean | null {
  const v = (value || '').trim().toLowerCase();
  if (!v) return null;
  if (['1', 'yes', 'true', 'instock', 'in stock'].includes(v)) return true;
  if (['0', 'no', 'false', 'outofstock', 'out of stock'].includes(v)) return false;
  return null;
}

function splitList(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseCategories(value: string | undefined): string[][] {
  return splitList(value).map((category) =>
    category
      .split('>')
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

function parseImages(value: string | undefined): string[] {
  return splitList(value).filter((url) => /^https?:\/\//i.test(url));
}

function stableInternalSku(sourceId: string, rawSku: string): string {
  return rawSku.trim() || `WC-${sourceId}`;
}

function sourceKey(value: string | null | undefined): string {
  return (value || '').trim();
}

function buildAttributeMap(columns: Record<string, string>): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (let i = 1; i <= 6; i++) {
    const name = columns[`attribute${i}name`]?.trim();
    const value = columns[`attribute${i}values`]?.trim() || columns[`attribute${i}value`]?.trim();
    if (name && value) attrs[name] = value;
  }
  return attrs;
}

function resolveStock(quantity: number | null, inStockFlag: boolean | null) {
  if (quantity != null && quantity < 0) {
    return { status: 'invalid' as const, quantity, inStockFlag };
  }
  if (quantity != null) {
    return { status: 'provided' as const, quantity, inStockFlag };
  }
  if (inStockFlag != null) {
    return { status: 'flagOnly' as const, quantity: null, inStockFlag };
  }
  return { status: 'unknown' as const, quantity: null, inStockFlag };
}

export function stageWooCommerceCatalog(csvText: string): WooStagingResult {
  const normalized = csvText.replace(/^\uFEFF/, '');
  if (!normalized) {
    return emptyResult(fingerprint(csvText));
  }

  const firstLine = normalized.split(/\r?\n/, 1)[0] || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? '\t' : ',';
  const records = parseCsvRecords(normalized, delimiter);
  if (records.length < 2) {
    return emptyResult(fingerprint(csvText));
  }

  const headers = records[0].map(cleanHeaderKey);

  const rows: WooStagedRow[] = [];
  for (let i = 1; i < records.length; i++) {
    const values = records[i];
    const columns: Record<string, string> = {};
    headers.forEach((header, index) => {
      columns[header] = values[index] || '';
    });

    const sourceId = columns.id?.trim();
    const title = columns.name?.trim() || columns.title?.trim() || '';
      if (!sourceId || !title) continue;

    const type = (columns.type || 'simple').trim().toLowerCase();
    const rawSku = (columns.sku || '').trim();
    const internalSku = stableInternalSku(sourceId, rawSku);
    const regularPrice = parseAmount(columns.regularprice || columns.price);
    const salePrice = parseAmount(columns.saleprice);
    const currentPrice = salePrice ?? regularPrice;
    const stockQuantity = parseAmount(columns.stock || columns.stockquantity);
    const inStockFlag = parseBool(columns.instock || columns.stockstatus);
    const stock = resolveStock(stockQuantity, inStockFlag);
    const warnings: string[] = [];

    if (!rawSku) warnings.push('Missing source SKU; deterministic internal SKU generated.');
    if (stock.status === 'invalid') warnings.push('Negative stock quarantined; do not create stock ledger movement.');
    if (stock.status === 'flagOnly') warnings.push('Stock is a source flag only; physical count required.');
    if (salePrice != null && regularPrice != null && salePrice > regularPrice) {
      warnings.push('Sale price is above regular price.');
    }
    if (!parseImages(columns.images).length) warnings.push('No valid source image URL.');

    const staged: WooStagedRow = {
      rowIndex: i,
      sourceId,
      sourceHash: fingerprint(JSON.stringify(values)),
      type,
      title,
      rawSku,
      internalSku,
      parentRaw: (columns.parent || '').trim() || null,
      regularPrice,
      salePrice,
      currentPrice,
      categories: parseCategories(columns.categories),
      tags: splitList(columns.tags),
      images: parseImages(columns.images),
      description: (columns.description || '').trim() || null,
      shortDescription: (columns.shortdescription || '').trim() || null,
      attributes: buildAttributeMap(columns),
      publishedInSource: parseBool(columns.published) === true,
      stock,
      warnings,
    };

    rows.push(staged);
  }

  const parentBySku = new Map(rows.filter((row) => row.type === 'variable').map((row) => [sourceKey(row.rawSku), row]));
  const families: WooStagedFamily[] = [];
  const familyChildren = new Map<string, WooStagedRow[]>();
  const orphanChildren: WooStagedRow[] = [];

  for (const child of rows.filter((row) => row.type === 'variation')) {
    const parent = child.parentRaw ? parentBySku.get(sourceKey(child.parentRaw)) : undefined;
    if (!parent) {
      child.warnings.push('Variation parent could not be resolved.');
      orphanChildren.push(child);
      continue;
    }
    const children = familyChildren.get(parent.sourceId) || [];
    children.push(child);
    familyChildren.set(parent.sourceId, children);
  }

  for (const parent of rows.filter((row) => row.type === 'variable')) {
    families.push({ parent, children: familyChildren.get(parent.sourceId) || [] });
  }

  const simpleProducts = rows.filter((row) => row.type === 'simple');

  return {
    rows,
    families,
    simpleProducts,
    orphanChildren,
    summary: {
      totalRows: rows.length,
      variableParents: families.length,
      simpleProducts: simpleProducts.length,
      childVariations: rows.filter((row) => row.type === 'variation').length,
      orphanChildren: orphanChildren.length,
      rowsWithWarnings: rows.filter((row) => row.warnings.length > 0).length,
      sourceFileHash: fingerprint(csvText),
    },
  };
}

function emptyResult(sourceFileHash: string): WooStagingResult {
  return {
    rows: [],
    families: [],
    simpleProducts: [],
    orphanChildren: [],
    summary: {
      totalRows: 0,
      variableParents: 0,
      simpleProducts: 0,
      childVariations: 0,
      orphanChildren: 0,
      rowsWithWarnings: 0,
      sourceFileHash,
    },
  };
}
