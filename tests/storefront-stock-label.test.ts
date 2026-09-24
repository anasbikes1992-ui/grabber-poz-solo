import { describe, expect, it } from 'vitest';
import { storefrontStockLabel, storefrontStockState } from '../src/lib/storefront/stock-label';

describe('storefront stock labels', () => {
  it('hides exact buyer-facing stock counts behind availability bands', () => {
    expect(storefrontStockState(0)).toBe('out_of_stock');
    expect(storefrontStockLabel(0)).toBe('Out of stock');
    expect(storefrontStockState(1)).toBe('running_out_soon');
    expect(storefrontStockLabel(9)).toBe('Running out soon');
    expect(storefrontStockState(10)).toBe('in_stock');
    expect(storefrontStockLabel(42)).toBe('In stock');
  });
});
