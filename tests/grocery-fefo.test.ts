import { describe, it, expect } from 'vitest';

export function classifyLotStatus(expiryDate: Date | string | null | undefined, now: Date = new Date()) {
  if (!expiryDate) return { status: 'NO_EXPIRY', daysToExpiry: null };
  const expMs = new Date(expiryDate).getTime();
  const nowMs = now.getTime();
  const daysToExpiry = Math.ceil((expMs - nowMs) / (1000 * 60 * 60 * 24));

  if (daysToExpiry < 0) return { status: 'EXPIRED', daysToExpiry };
  if (daysToExpiry <= 7) return { status: 'CRITICAL', daysToExpiry };
  if (daysToExpiry <= 30) return { status: 'WARNING', daysToExpiry };
  return { status: 'GOOD', daysToExpiry };
}

export function sortLotsFefo<T extends { expiryDate?: Date | string | null; receivedAt?: Date | string | null }>(lots: T[]): T[] {
  return [...lots].sort((a, b) => {
    const aExp = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
    const bExp = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
    if (aExp !== bExp) return aExp - bExp;
    const aRec = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
    const bRec = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
    return aRec - bRec;
  });
}

export function simulateFefoConsumption<T extends { id: string; qtyOnHand: number; expiryDate?: Date | string | null }>(
  lots: T[],
  requestedQty: number,
): { consumedLots: Array<{ lotId: string; qtyTaken: number }>; remainingLots: T[] } {
  const sorted = sortLotsFefo(lots.filter((l) => l.qtyOnHand > 0));
  let needed = requestedQty;
  const consumedLots: Array<{ lotId: string; qtyTaken: number }> = [];
  const remainingLots = sorted.map((l) => ({ ...l }));

  for (const lot of remainingLots) {
    if (needed <= 0) break;
    const take = Math.min(needed, lot.qtyOnHand);
    if (take <= 0) continue;
    lot.qtyOnHand -= take;
    consumedLots.push({ lotId: lot.id, qtyTaken: take });
    needed -= take;
  }

  return { consumedLots, remainingLots };
}

describe('Grocery FEFO & Expiry Radar Logic', () => {
  const baseDate = new Date('2026-09-10T12:00:00Z');

  it('correctly classifies lots into EXPIRED, CRITICAL, WARNING, GOOD, and NO_EXPIRY', () => {
    // 2 days ago -> EXPIRED
    const expired = classifyLotStatus(new Date('2026-09-08T12:00:00Z'), baseDate);
    expect(expired.status).toBe('EXPIRED');
    expect(expired.daysToExpiry).toBeLessThan(0);

    // in 4 days -> CRITICAL (<= 7d)
    const critical = classifyLotStatus(new Date('2026-09-14T12:00:00Z'), baseDate);
    expect(critical.status).toBe('CRITICAL');
    expect(critical.daysToExpiry).toBe(4);

    // in 20 days -> WARNING (<= 30d)
    const warning = classifyLotStatus(new Date('2026-09-30T12:00:00Z'), baseDate);
    expect(warning.status).toBe('WARNING');
    expect(warning.daysToExpiry).toBe(20);

    // in 90 days -> GOOD (> 30d)
    const good = classifyLotStatus(new Date('2026-12-09T12:00:00Z'), baseDate);
    expect(good.status).toBe('GOOD');
    expect(good.daysToExpiry).toBe(90);

    // null expiry -> NO_EXPIRY
    const noExp = classifyLotStatus(null, baseDate);
    expect(noExp.status).toBe('NO_EXPIRY');
    expect(noExp.daysToExpiry).toBeNull();
  });

  it('sorts inventory batches in FEFO order (earliest expiry first)', () => {
    const rawLots = [
      { id: 'lot-3', expiryDate: '2026-12-01', receivedAt: '2026-09-01' },
      { id: 'lot-1', expiryDate: '2026-09-15', receivedAt: '2026-09-01' },
      { id: 'lot-4', expiryDate: null, receivedAt: '2026-08-01' },
      { id: 'lot-2', expiryDate: '2026-10-01', receivedAt: '2026-09-01' },
    ];

    const sorted = sortLotsFefo(rawLots);
    expect(sorted[0].id).toBe('lot-1'); // Sep 15
    expect(sorted[1].id).toBe('lot-2'); // Oct 01
    expect(sorted[2].id).toBe('lot-3'); // Dec 01
    expect(sorted[3].id).toBe('lot-4'); // null
  });

  it('consumes stock from earliest expiry lots first across multiple batches', () => {
    const lots = [
      { id: 'lot-a', qtyOnHand: 5, expiryDate: '2026-09-15' }, // Expiring soonest
      { id: 'lot-b', qtyOnHand: 10, expiryDate: '2026-10-01' }, // Expiring next
      { id: 'lot-c', qtyOnHand: 20, expiryDate: '2026-12-01' }, // Long shelf life
    ];

    // Request 8 units (should consume all 5 from lot-a and 3 from lot-b)
    const result = simulateFefoConsumption(lots, 8);
    expect(result.consumedLots).toEqual([
      { lotId: 'lot-a', qtyTaken: 5 },
      { lotId: 'lot-b', qtyTaken: 3 },
    ]);

    const remainingA = result.remainingLots.find((l) => l.id === 'lot-a');
    const remainingB = result.remainingLots.find((l) => l.id === 'lot-b');
    const remainingC = result.remainingLots.find((l) => l.id === 'lot-c');

    expect(remainingA?.qtyOnHand).toBe(0);
    expect(remainingB?.qtyOnHand).toBe(7);
    expect(remainingC?.qtyOnHand).toBe(20);
  });
});
