/**
 * GRABBER BUSINESS OS — PAYMENT LIFECYCLE & GL ACCOUNTING INVARIANTS (M3 SLICE 3)
 *
 * Implements CI-007 (Payment Identity) and CI-008 (GL Identity).
 * Enforces single source of truth across all channels (POS, Storefront, PayHere, WhatsApp, Jarvis).
 */

import type { OrderStatus, PaymentStatus } from './order-state-machine';

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'WEBXPAY'
  | 'PAYHERE'
  | 'KOKO'
  | 'MINTPAY'
  | 'PAYZY'
  | 'STRIPE'
  | 'CREDIT'
  | 'COD';

export type PaymentRecordStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'CANCELLED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export interface PaymentTransactionRecord {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentRecordStatus;
  providerRef?: string | null;
  idempotencyKey?: string | null;
  createdAt?: Date;
}

export interface OrderFinancialSnapshot {
  id: string;
  orderNumber: string;
  channel: string;
  subtotal: number;
  discountTotal: number;
  taxableTotal: number;
  taxTotal: number;
  grandTotal: number;
  totalCost: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
}

export interface JournalLineDraft {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo: string;
}

export interface JournalEntryDraft {
  entryNumber: string;
  referenceType: 'SALE' | 'REFUND' | 'COD_SETTLEMENT' | 'POLIM_CREDIT';
  referenceId: string;
  description: string;
  lines: JournalLineDraft[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export interface PaymentIdentityAudit {
  orderTotal: number;
  capturedTotal: number;
  pendingTotal: number;
  failedTotal: number;
  refundedTotal: number;
  outstandingBalance: number;
  isFullyPaid: boolean;
  isOverpaid: boolean;
  isValid: boolean;
  reconciliationStatus: 'SETTLED' | 'PARTIAL' | 'UNPAID' | 'REFUNDED' | 'DISCREPANCY';
}

/**
 * Standard Chart of Accounts Mapping for Commerce Operations.
 */
export const STANDARD_COA = {
  CASH: { code: '1010', name: 'Cash on Hand' },
  BANK: { code: '1020', name: 'Bank Account' },
  AR_POLIM: { code: '1100', name: 'Accounts Receivable (Polim Potha)' },
  INVENTORY: { code: '1200', name: 'Merchandise Inventory' },
  AP_SUPPLIERS: { code: '2000', name: 'Accounts Payable (Suppliers)' },
  TAX_PAYABLE: { code: '2100', name: 'VAT / Output Tax Liability' },
  SALES_REVENUE: { code: '4000', name: 'Sales Revenue' },
  COGS: { code: '5000', name: 'Cost of Goods Sold (COGS)' },
} as const;

/**
 * Maps a checkout payment method to its receiving asset/receivable GL account code.
 */
export function getGLAccountForPaymentMethod(method: PaymentMethod): { code: string; name: string } {
  switch (method) {
    case 'CASH':
    case 'COD':
      return STANDARD_COA.CASH;
    case 'CARD':
    case 'PAYHERE':
    case 'WEBXPAY':
    case 'KOKO':
    case 'MINTPAY':
    case 'PAYZY':
    case 'STRIPE':
      return STANDARD_COA.BANK;
    case 'CREDIT':
      return STANDARD_COA.AR_POLIM;
    default:
      return STANDARD_COA.CASH;
  }
}

/**
 * CI-007: Payment Identity.
 * Evaluates sum(captured payments) vs order grand total.
 * Never treats PENDING, FAILED, or CANCELLED records as money received.
 */
export function auditPaymentIdentity(
  orderTotal: number,
  transactions: PaymentTransactionRecord[],
): PaymentIdentityAudit {
  let capturedTotal = 0;
  let pendingTotal = 0;
  let failedTotal = 0;
  let refundedTotal = 0;

  for (const tx of transactions) {
    switch (tx.status) {
      case 'CAPTURED':
        capturedTotal += tx.amount;
        break;
      case 'PENDING':
      case 'INITIATED':
      case 'AUTHORIZED':
        pendingTotal += tx.amount;
        break;
      case 'FAILED':
      case 'CANCELLED':
        failedTotal += tx.amount;
        break;
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        refundedTotal += tx.amount;
        break;
    }
  }

  // Precision rounding to 2 decimals
  capturedTotal = Math.round(capturedTotal * 100) / 100;
  pendingTotal = Math.round(pendingTotal * 100) / 100;
  failedTotal = Math.round(failedTotal * 100) / 100;
  refundedTotal = Math.round(refundedTotal * 100) / 100;

  const netCaptured = Math.max(0, Math.round((capturedTotal - refundedTotal) * 100) / 100);
  const outstandingBalance = Math.max(0, Math.round((orderTotal - netCaptured) * 100) / 100);

  const isFullyPaid = netCaptured >= orderTotal && orderTotal > 0;
  const isOverpaid = netCaptured > orderTotal;

  let reconciliationStatus: PaymentIdentityAudit['reconciliationStatus'] = 'UNPAID';
  if (refundedTotal >= capturedTotal && capturedTotal > 0) {
    reconciliationStatus = 'REFUNDED';
  } else if (isOverpaid) {
    reconciliationStatus = 'DISCREPANCY';
  } else if (isFullyPaid) {
    reconciliationStatus = 'SETTLED';
  } else if (netCaptured > 0) {
    reconciliationStatus = 'PARTIAL';
  }

  return {
    orderTotal,
    capturedTotal,
    pendingTotal,
    failedTotal,
    refundedTotal,
    outstandingBalance,
    isFullyPaid,
    isOverpaid,
    isValid: !isOverpaid,
    reconciliationStatus,
  };
}

/**
 * CI-008: Authoritative GL Double-Entry Journal Builder.
 * Generates an immutable, mathematically balanced double-entry journal entry
 * for a completed sale.
 *
 * Debits (Money/Receivables received) = Credits (Sales Revenue + Tax Liability)
 * Debits (COGS) = Credits (Inventory Relieved)
 */
export function buildSaleJournalEntry(params: {
  order: OrderFinancialSnapshot;
  payments: Array<{ method: PaymentMethod; amount: number }>;
}): JournalEntryDraft {
  const { order, payments } = params;
  const lines: JournalLineDraft[] = [];

  // 1. Payment Consideration Debits (Cash / Bank / AR)
  for (const p of payments) {
    const glAccount = getGLAccountForPaymentMethod(p.method);
    lines.push({
      accountCode: glAccount.code,
      accountName: glAccount.name,
      debit: p.amount,
      credit: 0,
      memo: `${p.method} tender received for Order ${order.orderNumber}`,
    });
  }

  // 2. Sales Revenue Credit (Taxable net subtotal)
  const netRevenue = Math.round((order.grandTotal - order.taxTotal) * 100) / 100;
  lines.push({
    accountCode: STANDARD_COA.SALES_REVENUE.code,
    accountName: STANDARD_COA.SALES_REVENUE.name,
    debit: 0,
    credit: netRevenue,
    memo: `Sales revenue for Order ${order.orderNumber}`,
  });

  // 3. Tax Liability Credit (if tax > 0)
  if (order.taxTotal > 0) {
    lines.push({
      accountCode: STANDARD_COA.TAX_PAYABLE.code,
      accountName: STANDARD_COA.TAX_PAYABLE.name,
      debit: 0,
      credit: order.taxTotal,
      memo: `Output tax liability for Order ${order.orderNumber}`,
    });
  }

  // 4. Inventory Relieved & COGS (if totalCost > 0)
  if (order.totalCost > 0) {
    lines.push({
      accountCode: STANDARD_COA.COGS.code,
      accountName: STANDARD_COA.COGS.name,
      debit: order.totalCost,
      credit: 0,
      memo: `Cost of goods sold for Order ${order.orderNumber}`,
    });

    lines.push({
      accountCode: STANDARD_COA.INVENTORY.code,
      accountName: STANDARD_COA.INVENTORY.name,
      debit: 0,
      credit: order.totalCost,
      memo: `Inventory relieved for Order ${order.orderNumber}`,
    });
  }

  const totalDebit = Math.round(lines.reduce((s, l) => s + l.debit, 0) * 100) / 100;
  const totalCredit = Math.round(lines.reduce((s, l) => s + l.credit, 0) * 100) / 100;
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

  if (!isBalanced) {
    throw new Error(
      `GL Imbalance detected in Order ${order.orderNumber}: Total Debit LKR ${totalDebit} !== Total Credit LKR ${totalCredit}`,
    );
  }

  return {
    entryNumber: `JRN-${order.orderNumber}`,
    referenceType: 'SALE',
    referenceId: order.id,
    description: `${order.channel} sale ${order.orderNumber}`,
    lines,
    totalDebit,
    totalCredit,
    isBalanced,
  };
}

/**
 * Compensating Journal Entry Builder for Refunds.
 * Reverses the economic impact without mutating or deleting historical journal records.
 */
export function buildCompensatingRefundJournal(params: {
  order: OrderFinancialSnapshot;
  refundNumber: string;
  refundAmount: number;
  refundTaxAmount?: number;
  refundMethod: PaymentMethod;
  restockedCost?: number;
}): JournalEntryDraft {
  const { order, refundNumber, refundAmount, refundTaxAmount = 0, refundMethod, restockedCost = 0 } = params;
  const lines: JournalLineDraft[] = [];

  const netRefundRevenue = Math.round((refundAmount - refundTaxAmount) * 100) / 100;

  // 1. Dr Sales Revenue (Reversal of revenue)
  lines.push({
    accountCode: STANDARD_COA.SALES_REVENUE.code,
    accountName: STANDARD_COA.SALES_REVENUE.name,
    debit: netRefundRevenue,
    credit: 0,
    memo: `Revenue reversed for Refund ${refundNumber} (Order ${order.orderNumber})`,
  });

  // 2. Dr Tax Liability (Reversal of tax payable if tax was refunded)
  if (refundTaxAmount > 0) {
    lines.push({
      accountCode: STANDARD_COA.TAX_PAYABLE.code,
      accountName: STANDARD_COA.TAX_PAYABLE.name,
      debit: refundTaxAmount,
      credit: 0,
      memo: `Tax liability reversed for Refund ${refundNumber}`,
    });
  }

  // 3. Cr Cash / Bank / AR (Refund paid out to customer)
  const refundAccount = getGLAccountForPaymentMethod(refundMethod);
  lines.push({
    accountCode: refundAccount.code,
    accountName: refundAccount.name,
    debit: 0,
    credit: refundAmount,
    memo: `Refund consideration paid via ${refundMethod}`,
  });

  // 4. Physical Restock Compensating entries
  if (restockedCost > 0) {
    lines.push({
      accountCode: STANDARD_COA.INVENTORY.code,
      accountName: STANDARD_COA.INVENTORY.name,
      debit: restockedCost,
      credit: 0,
      memo: `Inventory restored from Refund ${refundNumber}`,
    });
    lines.push({
      accountCode: STANDARD_COA.COGS.code,
      accountName: STANDARD_COA.COGS.name,
      debit: 0,
      credit: restockedCost,
      memo: `COGS reversed from Refund ${refundNumber}`,
    });
  }

  const totalDebit = Math.round(lines.reduce((s, l) => s + l.debit, 0) * 100) / 100;
  const totalCredit = Math.round(lines.reduce((s, l) => s + l.credit, 0) * 100) / 100;
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

  if (!isBalanced) {
    throw new Error(
      `Compensating Refund GL Imbalance for ${refundNumber}: Debit LKR ${totalDebit} !== Credit LKR ${totalCredit}`,
    );
  }

  return {
    entryNumber: `JRN-REFUND-${refundNumber}`,
    referenceType: 'REFUND',
    referenceId: order.id,
    description: `Compensating refund entry for Order ${order.orderNumber}`,
    lines,
    totalDebit,
    totalCredit,
    isBalanced,
  };
}

/**
 * Order Cancellation Policy:
 * Distinguishes unpaid/COD cancellation from paid cancellation/refund.
 * Prevents manufacturing fake failed money transactions for pending orders.
 */
export function resolveOrderCancellation(order: {
  id: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  decrementStock: boolean;
}): {
  allowed: boolean;
  requiresRefund: boolean;
  nextOrderStatus: OrderStatus;
  nextPaymentStatus: PaymentStatus;
  restoreStock: boolean;
  action: 'CANCEL_UNPAID' | 'REFUND_REQUIRED' | 'ALREADY_CANCELLED';
} {
  if (order.orderStatus === 'CANCELLED') {
    return {
      allowed: false,
      requiresRefund: false,
      nextOrderStatus: 'CANCELLED',
      nextPaymentStatus: order.paymentStatus,
      restoreStock: false,
      action: 'ALREADY_CANCELLED',
    };
  }

  if (order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIALLY_REFUNDED') {
    // Money was captured — cannot cancel without refund
    return {
      allowed: false,
      requiresRefund: true,
      nextOrderStatus: order.orderStatus,
      nextPaymentStatus: order.paymentStatus,
      restoreStock: false,
      action: 'REFUND_REQUIRED',
    };
  }

  // Unpaid or PENDING COD cancellation
  return {
    allowed: true,
    requiresRefund: false,
    nextOrderStatus: 'CANCELLED',
    nextPaymentStatus: 'FAILED',
    restoreStock: order.decrementStock,
    action: 'CANCEL_UNPAID',
  };
}

/**
 * Idempotency checker for webhook / payment callbacks.
 * Returns true if a payment with the provider transaction reference has already been captured.
 */
export function isPaymentCallbackDuplicate(
  existingTransactions: PaymentTransactionRecord[],
  providerRef: string,
): boolean {
  return existingTransactions.some(
    (tx) => tx.providerRef === providerRef && (tx.status === 'CAPTURED' || tx.status === 'PARTIALLY_REFUNDED'),
  );
}
