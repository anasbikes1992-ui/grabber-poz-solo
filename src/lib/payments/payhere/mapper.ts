import type { CanonicalPaymentStatus } from '../payment-types';

export function mapPayHereStatusCode(statusCode: string | number): CanonicalPaymentStatus {
  const code = String(statusCode).trim();
  switch (code) {
    case '2':
      return 'CAPTURED';
    case '0':
      return 'PENDING';
    case '-1':
      return 'CANCELLED';
    case '-2':
    case '-3':
      return 'FAILED';
    default:
      return 'FAILED';
  }
}
