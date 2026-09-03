import type { CanonicalPaymentStatus } from '../payment-types';

export function mapWebXPayStatus(rawStatus: string | number): CanonicalPaymentStatus {
  const status = String(rawStatus).trim().toLowerCase();
  switch (status) {
    case 'success':
    case '1':
    case 'paid':
      return 'CAPTURED';
    case 'pending':
    case '0':
      return 'PENDING';
    case 'cancelled':
    case 'cancel':
      return 'CANCELLED';
    case 'failed':
    case 'error':
    default:
      return 'FAILED';
  }
}
