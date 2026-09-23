/**
 * Bank reconciliation helpers (pure + service guards).
 */

export function clearedLinesSum(lines: Array<{ amount: string | number; cleared: boolean }>): number {
  return lines
    .filter((l) => l.cleared)
    .reduce((s, l) => s + Number(l.amount || 0), 0);
}

/**
 * Statement should balance: opening + cleared movements ≈ closing (within 0.01).
 * Cleared amounts are signed as entered (positive deposits, negative withdrawals).
 */
export function assertReconciliationBalances(input: {
  openingBalance: number;
  closingBalance: number;
  clearedSum: number;
  tolerance?: number;
}): void {
  const tol = input.tolerance ?? 0.01;
  const expected = Math.round((Number(input.openingBalance) + Number(input.clearedSum)) * 100) / 100;
  const closing = Math.round(Number(input.closingBalance) * 100) / 100;
  if (Math.abs(expected - closing) > tol) {
    throw new Error(
      `Reconciliation out of balance: opening ${input.openingBalance} + cleared ${input.clearedSum} = ${expected}, closing ${closing}`,
    );
  }
}
