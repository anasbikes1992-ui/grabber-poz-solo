/**
 * Vertical module pure helpers (TDD-friendly).
 */

export function calcHpEmi(totalCashPrice: number, downPayment: number, totalMonths: number): number {
  const months = Math.max(1, Math.floor(totalMonths));
  const principal = Math.max(0, totalCashPrice - downPayment);
  return Math.ceil(principal / months);
}

export function loyaltyTierForSpend(totalSpent: number): 'SILVER' | 'GOLD' | 'PLATINUM' {
  if (totalSpent >= 100000) return 'PLATINUM';
  if (totalSpent >= 25000) return 'GOLD';
  return 'SILVER';
}

export function loyaltyEarnPoints(amountLkr: number): number {
  return Math.floor(Math.max(0, amountLkr) / 100);
}

export function repairBalanceDue(parts: number, service: number, advance: number): number {
  return parts + service - advance;
}
