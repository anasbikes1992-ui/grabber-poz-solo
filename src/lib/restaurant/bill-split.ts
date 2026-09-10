/**
 * VERT-R05 — Partition KOT lines into N settle buckets (seat / bill split).
 */
import type { KotLineWithModifiers } from '@/lib/restaurant/modifiers';
import { lineUnitPriceWithModifiers } from '@/lib/restaurant/modifiers';

export type SettlePart = {
  itemIndexes: number[];
  paymentMethod?: string;
  label?: string;
};

/** Evenly distribute line indexes into `count` parts (seat split). */
export function partitionItemIndexes(lineCount: number, count: number): number[][] {
  const n = Math.max(1, Math.min(8, Math.floor(count) || 1));
  const parts: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < lineCount; i++) {
    parts[i % n].push(i);
  }
  return parts.filter((p) => p.length > 0);
}

export function checkoutLinesFromIndexes(
  rawItems: KotLineWithModifiers[],
  indexes: number[],
): Array<{ productId: string; quantity: number; unitPrice: number; name: string }> {
  const out: Array<{ productId: string; quantity: number; unitPrice: number; name: string }> = [];
  for (const idx of indexes) {
    const i = rawItems[idx];
    if (!i?.productId) continue;
    out.push({
      productId: i.productId,
      quantity: Math.max(1, Number(i.qty || 1)),
      unitPrice: lineUnitPriceWithModifiers(i),
      name: i.modifiers?.length ? `${i.name} (+${i.modifiers.map((m) => m.name).join(', ')})` : i.name,
    });
  }
  return out;
}
