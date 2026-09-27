import { describe, expect, it } from 'vitest';
import { normalizeTransferQuantity, resolveReceivedTransferQuantity } from '@/lib/inventory/transfer-workflow';

describe('transfer workflow invariants', () => {
  it('rejects zero, negative, and fractional quantities', () => {
    expect(() => normalizeTransferQuantity(0)).toThrow(/positive integer/);
    expect(() => normalizeTransferQuantity(-1)).toThrow(/positive integer/);
    expect(() => normalizeTransferQuantity(1.5)).toThrow(/positive integer/);
    expect(normalizeTransferQuantity(2)).toBe(2);
  });

  it('defaults missing receive quantity to the dispatched quantity', () => {
    expect(resolveReceivedTransferQuantity(5)).toBe(5);
  });

  it('blocks over-receipts and short receipts until variance workflow exists', () => {
    expect(() => resolveReceivedTransferQuantity(5, 6)).toThrow(/dispatched quantity is 5/);
    expect(() => resolveReceivedTransferQuantity(5, 0)).toThrow(/positive integer/);
    expect(() => resolveReceivedTransferQuantity(5, 4)).toThrow(/explicit variance workflow/);
  });
});
