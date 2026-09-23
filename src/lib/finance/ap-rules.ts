export const AP_INVOICE_STATUSES = ['DRAFT', 'POSTED', 'PARTIAL', 'PAID', 'VOID'] as const;
export type ApInvoiceStatus = (typeof AP_INVOICE_STATUSES)[number];

export function assertCanPost(status: string): void {
  if (status !== 'DRAFT') {
    throw new Error(`Cannot post invoice in status ${status}; must be DRAFT`);
  }
}

export function assertCanPay(status: string, amount: number, remaining: number): void {
  if (status !== 'POSTED' && status !== 'PARTIAL') {
    throw new Error(`Cannot pay invoice in status ${status}; must be POSTED or PARTIAL`);
  }
  if (!(amount > 0)) {
    throw new Error('Payment amount must be greater than 0');
  }
  if (amount > remaining + 1e-9) {
    throw new Error(`Overpay rejected: amount ${amount} exceeds remaining ${remaining}`);
  }
}

export function nextStatusAfterPayment(total: number, paid: number): 'PARTIAL' | 'PAID' {
  if (paid >= total - 1e-9) return 'PAID';
  return 'PARTIAL';
}
