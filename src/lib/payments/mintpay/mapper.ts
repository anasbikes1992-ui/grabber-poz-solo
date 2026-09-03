import type { CanonicalPaymentStatus } from '../payment-types';

export function mapMintpayStatus(rawStatus: string | number): CanonicalPaymentStatus {
  const status = String(rawStatus).trim().toUpperCase();
  switch (status) {
    case 'SUCCESS':
    case 'PAID':
    case 'COMPLETED':
      return 'CAPTURED';
    case 'PENDING':
    case 'PROCESSING':
      return 'PENDING';
    case 'CANCELLED':
    case 'EXPIRED':
      return 'CANCELLED';
    case 'REJECTED':
    case 'FAILED':
    default:
      return 'FAILED';
  }
}
