import { describe, it, expect } from 'vitest';
import { REQUIRED_COA } from '../src/lib/commerce/ensure-coa';

describe('ensure chart of accounts', () => {
  it('includes POS journal codes', () => {
    const codes = REQUIRED_COA.map((r) => r.code);
    expect(codes).toContain('4000');
    expect(codes).toContain('2100');
    expect(codes).toContain('5000');
    expect(codes).toContain('1200');
    expect(codes).toContain('1010');
  });
});
