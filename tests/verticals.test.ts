import { describe, expect, it } from 'vitest';
import { calcHpEmi, loyaltyEarnPoints, loyaltyTierForSpend, repairBalanceDue } from '../src/lib/verticals/math';

describe('W5-06 vertical math', () => {
  it('computes HP EMI from cash price and down payment', () => {
    expect(calcHpEmi(125000, 25000, 12)).toBe(Math.ceil(100000 / 12));
    expect(calcHpEmi(10000, 10000, 6)).toBe(0);
  });

  it('maps loyalty tiers by spend', () => {
    expect(loyaltyTierForSpend(0)).toBe('SILVER');
    expect(loyaltyTierForSpend(24999)).toBe('SILVER');
    expect(loyaltyTierForSpend(25000)).toBe('GOLD');
    expect(loyaltyTierForSpend(100000)).toBe('PLATINUM');
  });

  it('earns 1 point per LKR 100', () => {
    expect(loyaltyEarnPoints(999)).toBe(9);
    expect(loyaltyEarnPoints(10000)).toBe(100);
  });

  it('computes repair balance due', () => {
    expect(repairBalanceDue(5000, 2500, 1000)).toBe(6500);
  });
});
