import { describe, it, expect } from 'vitest';
import { InsufficientStockError } from '../src/lib/inventory/stock-service';

describe('StockService', () => {
  it('InsufficientStockError carries product context', () => {
    const err = new InsufficientStockError('No stock', 'prod-1', 2, 5);
    expect(err.name).toBe('InsufficientStockError');
    expect(err.productId).toBe('prod-1');
    expect(err.available).toBe(2);
    expect(err.requested).toBe(5);
  });
});
