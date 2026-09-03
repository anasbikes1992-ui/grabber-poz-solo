import type { CanonicalPaymentStatus } from '../payment-types';

export function mapKokoStatus(rawStatus: string | number): CanonicalPaymentStatus {
  const status = String(rawStatus).trim().toUpperCase();
  switch (status) {
    case 'APPROVED':
    case 'SUCCESS':
    case 'PAID':
    case 'CAPTURED':
      return 'CAPTURED';
    case 'PENDING':
    case 'INITIATED':
      return 'PENDING';
    case 'CANCELLED':
    case 'EXPIRED':
      return 'CANCELLED';
    case 'DECLINED':
    case 'FAILED':
    default:
      return 'FAILED';
  }
}
