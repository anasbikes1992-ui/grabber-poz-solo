/**
 * VERT-R04 — Menu modifiers on KOT lines (price delta + optional ingredient).
 */

export type KotModifier = {
  id?: string;
  name: string;
  priceDelta?: number;
  /** Extra ingredient product to deplete on SERVED */
  ingredientProductId?: string;
  ingredientQty?: number;
};

export type KotLineWithModifiers = {
  productId?: string;
  name: string;
  qty: number;
  price: number;
  notes?: string;
  station?: string;
  course?: string;
  modifiers?: KotModifier[];
};

export function lineUnitPriceWithModifiers(line: KotLineWithModifiers): number {
  const base = Math.max(0, Number(line.price || 0));
  const deltas = (line.modifiers || []).reduce((s, m) => s + Math.max(0, Number(m.priceDelta || 0)), 0);
  return base + deltas;
}

export function normalizeKotItems(raw: unknown[]): KotLineWithModifiers[] {
  return (Array.isArray(raw) ? raw : []).map((i: any) => {
    const modifiers: KotModifier[] = Array.isArray(i.modifiers)
      ? i.modifiers.map((m: any) => ({
          id: m.id ? String(m.id) : undefined,
          name: String(m.name || 'Modifier'),
          priceDelta: Math.max(0, Number(m.priceDelta || 0)),
          ingredientProductId: m.ingredientProductId ? String(m.ingredientProductId) : undefined,
          ingredientQty: Math.max(0, Number(m.ingredientQty ?? 1)),
        }))
      : [];
    const basePrice = Math.max(0, Number(i.price || 0));
    return {
      productId: i.productId ? String(i.productId) : undefined,
      name: String(i.name || 'Item'),
      qty: Math.max(1, Number(i.qty || 1)),
      price: basePrice,
      notes: i.notes || undefined,
      station: i.station || 'KITCHEN',
      course: i.course || 'MAIN',
      modifiers: modifiers.length ? modifiers : undefined,
    };
  });
}

export function kotLineTotal(line: KotLineWithModifiers): number {
  return lineUnitPriceWithModifiers(line) * Math.max(1, Number(line.qty || 1));
}
