import { describe, it, expect } from 'vitest';
import { getPartsLines, sumPartsAmount, type RepairPartLine } from '../src/lib/repairs/parts-from-stock';

describe('repair parts from stock', () => {
  it('reads parts lines from checklist json', () => {
    const lines: RepairPartLine[] = [
      {
        id: 'a',
        productId: 'p1',
        name: 'Battery',
        sku: 'BAT-1',
        qty: 1,
        unitPrice: 5000,
        lineTotal: 5000,
        addedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    expect(getPartsLines({ partsLines: lines })).toHaveLength(1);
    expect(getPartsLines({})).toEqual([]);
  });

  it('sums parts amount for repair billing', () => {
    const total = sumPartsAmount([
      {
        id: 'a',
        productId: 'p1',
        name: 'Screen',
        sku: 'SCR-1',
        qty: 2,
        unitPrice: 3000,
        lineTotal: 6000,
        addedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'b',
        productId: 'p2',
        name: 'Adhesive',
        sku: 'GLU-1',
        qty: 1,
        unitPrice: 500,
        lineTotal: 500,
        addedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    expect(total).toBe(6500);
  });
});
