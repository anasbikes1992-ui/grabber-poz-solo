import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROMOTIONS,
  evaluateCartPromotions,
  evaluatePromotion,
} from '../src/lib/commerce/promotion-engine';
import { buildPayHereCheckoutPayload } from '../src/lib/payments/payhere-checkout';
import { isWhatsAppGreeting } from '../src/lib/whatsapp/inbound-handler';

describe('Phase C — cart promotions', () => {
  it('auto-applies storefront cart rule at 10k+', () => {
    const r = evaluateCartPromotions(DEFAULT_PROMOTIONS, {
      subtotal: 12000,
      itemCount: 2,
      channel: 'STOREFRONT',
    });
    expect(r.valid).toBe(true);
    expect(r.discountTotal).toBe(1000);
    expect(r.autoApplied).toBe(true);
  });

  it('stacks manual code after auto rule evaluation separately', () => {
    const code = evaluatePromotion(DEFAULT_PROMOTIONS, 'WELCOME500', 12000, '2026-06-01');
    expect(code.valid).toBe(true);
    expect(code.discountTotal).toBe(500);
  });
});

describe('Phase C — PayHere checkout payload', () => {
  it('builds signed form fields when configured', () => {
    process.env.PAYHERE_MERCHANT_ID = '1211149';
    process.env.PAYHERE_SECRET = 'test_secret';
    process.env.PAYHERE_MODE = 'sandbox';
    const payload = buildPayHereCheckoutPayload({
      orderNumber: 'WEB-12345678',
      amount: 10620,
      itemsDescription: '2x Demo product',
    });
    expect(payload.checkoutUrl).toContain('payhere');
    expect(payload.fields.hash).toHaveLength(32);
    expect(payload.fields.order_id).toBe('WEB-12345678');
  });
});

describe('Phase C — WhatsApp greeting', () => {
  it('matches hi opener', () => {
    expect(isWhatsAppGreeting('hi')).toBe(true);
  });
});
