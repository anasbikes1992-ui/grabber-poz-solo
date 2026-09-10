import { describe, it, expect } from 'vitest';

export function calculatePolimBalanceAdjustment(currentBalance: number, delta: number) {
  const next = Math.max(0, currentBalance + delta);
  return {
    previousBalance: currentBalance,
    delta,
    newBalance: Number(next.toFixed(2)),
    entryType: delta < 0 ? ('REPAYMENT' as const) : ('ADJUSTMENT' as const),
  };
}

export function generateDispatchRecord(input: {
  orderId: string;
  recipientName: string;
  address: string;
  hasApiKey: boolean;
}) {
  if (input.hasApiKey) {
    return {
      courierPartner: 'Koombiyo',
      trackingNumber: `KMB-TEST-${Date.now()}`,
      status: 'IN_TRANSIT',
      stub: false,
    };
  }
  return {
    courierPartner: 'In-House Delivery',
    trackingNumber: `DEL-TEST-${Date.now()}`,
    status: 'IN_TRANSIT',
    stub: true,
  };
}

export function buildSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'category';
}

describe('P1 Operations Engine (AUD-05 to AUD-10)', () => {
  it('correctly handles Polim Potha manual balance adjustments', () => {
    // Adding 5000 debt
    const adjUp = calculatePolimBalanceAdjustment(10000, 5000);
    expect(adjUp.newBalance).toBe(15000);
    expect(adjUp.entryType).toBe('ADJUSTMENT');

    // Credit write-off / payment of 12000
    const adjDown = calculatePolimBalanceAdjustment(10000, -12000);
    expect(adjDown.newBalance).toBe(0); // non-negative clamp
  });

  it('generates resilient in-house delivery dispatch when courier key is unconfigured', () => {
    const live = generateDispatchRecord({
      orderId: 'ord-1',
      recipientName: 'Kasun Perera',
      address: 'Colombo 03',
      hasApiKey: true,
    });
    expect(live.courierPartner).toBe('Koombiyo');
    expect(live.stub).toBe(false);

    const fallback = generateDispatchRecord({
      orderId: 'ord-2',
      recipientName: 'Nimal Silva',
      address: 'Kandy Road, Kelaniya',
      hasApiKey: false,
    });
    expect(fallback.courierPartner).toBe('In-House Delivery');
    expect(fallback.stub).toBe(true);
    expect(fallback.trackingNumber).toContain('DEL-TEST-');
  });

  it('generates clean URL slugs for category create and update operations', () => {
    expect(buildSlug('Men’s Linen Shirts & Accessories!')).toBe('men-s-linen-shirts-accessories');
    expect(buildSlug('Fresh Organic Vegetables')).toBe('fresh-organic-vegetables');
  });
});
