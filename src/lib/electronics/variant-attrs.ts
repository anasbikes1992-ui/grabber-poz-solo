import type { ElectronicsVariant, ElectronicsVariantAttrs } from './types';
import { CONDITION_LABELS, WARRANTY_LABELS } from './types';

export function parseElectronicsAttrs(raw: Record<string, string> | null | undefined): ElectronicsVariantAttrs {
  if (!raw) return {};
  return {
    storage: raw.Storage || raw.storage,
    color: raw.Color || raw.color,
    condition: raw.Condition || raw.condition,
    warrantyType: raw.Warranty || raw.warrantyType || raw.warranty,
  };
}

export function toElectronicsVariant(
  productId: string,
  row: {
    id: string;
    sku: string;
    salePrice: number;
    attributesJson?: Record<string, string> | null;
    stock: number;
  },
): ElectronicsVariant {
  const attrs = parseElectronicsAttrs(row.attributesJson);
  return {
    id: row.id,
    productId,
    sku: row.sku,
    storage: attrs.storage || '128GB',
    color: attrs.color || 'Default',
    condition: attrs.condition || 'SEALED_NEW',
    warrantyType: attrs.warrantyType || 'STORE_WARRANTY_6M',
    regularPrice: row.salePrice,
    salePrice: row.salePrice,
    stockOnHand: row.stock,
  };
}

export function matchVariantByAttrs(
  variants: ElectronicsVariant[],
  pick: Partial<ElectronicsVariantAttrs>,
): ElectronicsVariant | undefined {
  return variants.find(
    (v) =>
      (!pick.storage || v.storage === pick.storage) &&
      (!pick.color || v.color === pick.color) &&
      (!pick.condition || v.condition === pick.condition) &&
      (!pick.warrantyType || v.warrantyType === pick.warrantyType),
  );
}

export function uniqueAttrValues(variants: ElectronicsVariant[], key: keyof ElectronicsVariantAttrs) {
  const mapKey = key === 'warrantyType' ? 'warrantyType' : key;
  const set = new Set<string>();
  for (const v of variants) {
    const val = v[mapKey as keyof ElectronicsVariant];
    if (typeof val === 'string' && val) set.add(val);
  }
  return [...set];
}

export function conditionLabel(code: string) {
  return CONDITION_LABELS[code] || code.replace(/_/g, ' ');
}

export function warrantyLabel(code: string) {
  return WARRANTY_LABELS[code] || code.replace(/_/g, ' ');
}
