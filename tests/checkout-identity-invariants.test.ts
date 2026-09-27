import { describe, expect, it } from 'vitest';
import { resolveCheckoutCustomerId } from '@/lib/commerce/pos-checkout-service';
import { assertCreditCheckoutHasCustomer } from '@/lib/db/repositories/checkout-repo';

describe('checkout identity and credit invariants', () => {
  it('binds storefront checkout to the authenticated shopper customer id', () => {
    expect(resolveCheckoutCustomerId({ channel: 'STOREFRONT', shopperCustomerId: 'cust-auth' })).toBe('cust-auth');
    expect(
      resolveCheckoutCustomerId({
        channel: 'STOREFRONT',
        customerId: 'cust-auth',
        shopperCustomerId: 'cust-auth',
      }),
    ).toBe('cust-auth');
    expect(() =>
      resolveCheckoutCustomerId({
        channel: 'STOREFRONT',
        customerId: 'cust-other',
        shopperCustomerId: 'cust-auth',
      }),
    ).toThrow(/identity mismatch/);
  });

  it('requires a customer for credit checkout', () => {
    expect(() => assertCreditCheckoutHasCustomer('CREDIT')).toThrow(/Customer ID is required/);
    expect(() => assertCreditCheckoutHasCustomer('CREDIT', 'cust-1')).not.toThrow();
    expect(() => assertCreditCheckoutHasCustomer('CASH')).not.toThrow();
  });
});
