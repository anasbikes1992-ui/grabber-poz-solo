import { describe, expect, it } from 'vitest';
import {
  assertValidRiderPhone,
  buildRiderDeliveryMessage,
  normalizeRiderPhone,
  notificationStatusFromWhatsApp,
  selectAutoRider,
} from '../src/lib/delivery/riders';

describe('in-house delivery riders', () => {
  it('normalizes and validates WhatsApp numbers', () => {
    expect(normalizeRiderPhone('+94 77 123 4567')).toBe('94771234567');
    expect(assertValidRiderPhone('0771234567')).toBe('0771234567');
    expect(() => assertValidRiderPhone('123')).toThrow('Valid WhatsApp number required');
  });

  it('auto-assigns active branch-compatible rider with the lowest load', () => {
    const rider = selectAutoRider([
      { id: 'inactive', name: 'Inactive', whatsappPhone: '94770000000', active: false, activeDeliveryCount: 0 },
      { id: 'busy', name: 'Busy', whatsappPhone: '94771111111', active: true, homeBranchId: 'b1', activeDeliveryCount: 4 },
      { id: 'best', name: 'Best', whatsappPhone: '94772222222', active: true, homeBranchId: 'b1', activeDeliveryCount: 1 },
      { id: 'other', name: 'Other', whatsappPhone: '94773333333', active: true, homeBranchId: 'b2', activeDeliveryCount: 0 },
    ], 'b1');

    expect(rider?.id).toBe('best');
  });

  it('falls back to all active riders when no branch-compatible rider exists', () => {
    const rider = selectAutoRider([
      { id: 'other', name: 'Other', whatsappPhone: '94773333333', active: true, homeBranchId: 'b2', activeDeliveryCount: 2 },
      { id: 'least', name: 'Least', whatsappPhone: '94774444444', active: true, homeBranchId: 'b3', activeDeliveryCount: 0 },
    ], 'b1');

    expect(rider?.id).toBe('least');
  });

  it('uses oldest assignment timestamp as tie-breaker', () => {
    const rider = selectAutoRider([
      { id: 'newer', name: 'Newer', whatsappPhone: '94771111111', active: true, activeDeliveryCount: 1, lastAssignedAt: '2026-10-07T10:00:00Z' },
      { id: 'older', name: 'Older', whatsappPhone: '94772222222', active: true, activeDeliveryCount: 1, lastAssignedAt: '2026-10-01T10:00:00Z' },
    ]);

    expect(rider?.id).toBe('older');
  });

  it('formats rider delivery message without internal financial fields', () => {
    const message = buildRiderDeliveryMessage({
      orderNumber: 'ORD-1001',
      customerName: 'Kasun',
      customerPhone: '0771234567',
      address: 'Colombo 03',
      codAmount: 2500,
      paymentStatus: 'PENDING',
      trackingNumber: 'INH-123',
      deliveryNoteUrl: 'https://shop/api/orders/ORD-1001/delivery-note',
    });

    expect(message).toContain('ORD-1001');
    expect(message).toContain('COD LKR 2500.00');
    expect(message).not.toMatch(/cost|profit|margin/i);
  });

  it('maps WhatsApp send outcomes to rider notification statuses', () => {
    expect(notificationStatusFromWhatsApp({ success: true, stub: true, preview: { to: '1', text: 'x' } })).toBe('STUB');
    expect(notificationStatusFromWhatsApp({ success: true, provider: {}, messageId: 'wamid.1' })).toBe('SENT');
    expect(notificationStatusFromWhatsApp({ success: false, error: 'no provider' })).toBe('FAILED');
  });
});
