import type { CanonicalPaymentStatus } from '../payment-types';

export function mapPayzyStatus(rawStatus: string | number): CanonicalPaymentStatus {
  const status = String(rawStatus).trim().toUpperCase();
  switch (status) {
    case 'SUCCESS':
    case 'PAID':
    case 'CAPTURED':
      return 'CAPTURED';
    case 'PENDING':
    case 'INITIATED':
      return 'PENDING';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'FAILED':
    case 'DECLINED':
    default:
      return 'FAILED';
  }
}
