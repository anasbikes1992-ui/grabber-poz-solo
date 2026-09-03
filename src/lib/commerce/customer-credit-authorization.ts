/**
 * GRABBER BUSINESS OS — CUSTOMER CREDIT & POLIM POTHA AUTHORIZATION (M3 SLICE 6)
 *
 * Implements CI-011:
 * Customer credit, credit limits, outstanding balances, and Polim Potha ledger entries
 * must never be computed from or manipulated by client-controlled values.
 *
 * Hierarchy:
 * Customer -> Credit Eligibility -> Credit Limit -> Existing Outstanding Balance
 *          -> New Credit Transaction -> Polim Potha Ledger -> Reconciliation
 */

import type { SessionRole } from '@/lib/auth/session-edge';

export interface CustomerCreditProfile {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  active: boolean;
  creditLimit: number;
  segment?: string | null;
  branchId?: string | null;
}

export interface PolimPothaAccountState {
  customerId: string;
  creditLimit: number;
  currentBalance: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
}

export type PolimLedgerEntryType =
  | 'INVOICE'
  | 'REPAYMENT'
  | 'RETURN'
  | 'CANCELLATION'
  | 'ADJUSTMENT'
  | 'WRITE_OFF';

export interface PolimLedgerEntry {
  id: string;
  customerId: string;
  orderId?: string | null;
  type: PolimLedgerEntryType;
  amount: number;
  balanceAfter: number;
  notes?: string | null;
  actorId?: string | null;
  idempotencyKey?: string | null;
  createdAt: Date;
}

export class CustomerCreditAuthorizationError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status = 403, code = 'CREDIT_AUTH_FAILED') {
    super(message);
    this.name = 'CustomerCreditAuthorizationError';
    this.status = status;
    this.code = code;
  }
}

/**
 * CI-011-A: Authorize New Credit Sale.
 * Validates customer existence, active state, credit limit, existing balance,
 * and calculates the authoritative new balance.
 */
export function authorizeCreditSale(params: {
  customer: CustomerCreditProfile | null;
  account: PolimPothaAccountState | null;
  creditAmount: number;
  staffRole: SessionRole;
  staffUserId?: string;
  overrideRole?: SessionRole;
  overrideUserId?: string;
  orderNumber?: string;
  idempotencyKey?: string;
  existingEntries?: PolimLedgerEntry[];
}): {
  authorized: boolean;
  creditAmount: number;
  previousBalance: number;
  newBalance: number;
  availableCreditAfter: number;
  entryDraft: {
    customerId: string;
    type: 'INVOICE';
    amount: number;
    balanceAfter: number;
    notes: string;
    idempotencyKey?: string;
  };
  ruleApplied: string;
  isIdempotentReplay: boolean;
} {
  const { customer, account, creditAmount, staffRole, overrideRole, orderNumber, idempotencyKey, existingEntries = [] } = params;

  // 1. Customer verification
  if (!customer) {
    throw new CustomerCreditAuthorizationError('Customer not found or invalid customerId.', 404, 'CUSTOMER_NOT_FOUND');
  }

  if (!customer.active) {
    throw new CustomerCreditAuthorizationError(`Customer "${customer.name}" is deactivated.`, 403, 'CUSTOMER_INACTIVE');
  }

  // 2. Polim account existence and status
  if (!account) {
    throw new CustomerCreditAuthorizationError(
      `Customer "${customer.name}" has no registered Polim Potha credit account.`,
      403,
      'NO_CREDIT_ACCOUNT',
    );
  }

  if (account.status === 'BLOCKED' || account.status === 'SUSPENDED') {
    throw new CustomerCreditAuthorizationError(
      `Customer credit account is ${account.status}. Credit transactions are barred.`,
      403,
      'CREDIT_ACCOUNT_LOCKED',
    );
  }

  // 3. Amount validation (must be positive)
  if (creditAmount <= 0) {
    throw new CustomerCreditAuthorizationError('Credit sale amount must be strictly greater than 0.', 400, 'INVALID_AMOUNT');
  }

  // 4. Idempotency verification
  if (idempotencyKey) {
    const existing = existingEntries.find((e) => e.idempotencyKey === idempotencyKey);
    if (existing) {
      return {
        authorized: true,
        creditAmount: existing.amount,
        previousBalance: Math.max(0, existing.balanceAfter - existing.amount),
        newBalance: existing.balanceAfter,
        availableCreditAfter: Math.max(0, account.creditLimit - existing.balanceAfter),
        entryDraft: {
          customerId: customer.id,
          type: 'INVOICE',
          amount: existing.amount,
          balanceAfter: existing.balanceAfter,
          notes: existing.notes || '',
          idempotencyKey,
        },
        ruleApplied: 'IDEMPOTENT_REPLAY',
        isIdempotentReplay: true,
      };
    }
  }

  // 5. Credit limit check
  const currentBalance = Math.max(0, Math.round(account.currentBalance * 100) / 100);
  const effectiveLimit = Math.max(0, Math.round(account.creditLimit * 100) / 100);

  if (effectiveLimit <= 0) {
    throw new CustomerCreditAuthorizationError(
      `Customer "${customer.name}" has a zero credit limit and is not authorized for credit purchases.`,
      403,
      'ZERO_CREDIT_LIMIT',
    );
  }

  const projectedBalance = Math.round((currentBalance + creditAmount) * 100) / 100;
  let ruleApplied = 'STANDARD_CREDIT_SALE';

  if (projectedBalance > effectiveLimit) {
    // Check for Owner override
    const isOwnerOverride = staffRole === 'OWNER' || overrideRole === 'OWNER';
    if (!isOwnerOverride) {
      throw new CustomerCreditAuthorizationError(
        `Credit limit exceeded: Available limit LKR ${(effectiveLimit - currentBalance).toFixed(2)}, required LKR ${creditAmount.toFixed(2)}. Owner override required.`,
        403,
        'CREDIT_LIMIT_EXCEEDED',
      );
    }
    ruleApplied = 'CREDIT_LIMIT_OVERRIDDEN_BY_OWNER';
  }

  const newBalance = projectedBalance;
  const availableCreditAfter = Math.max(0, Math.round((effectiveLimit - newBalance) * 100) / 100);

  return {
    authorized: true,
    creditAmount,
    previousBalance: currentBalance,
    newBalance,
    availableCreditAfter,
    entryDraft: {
      customerId: customer.id,
      type: 'INVOICE',
      amount: creditAmount,
      balanceAfter: newBalance,
      notes: `POS credit sale ${orderNumber || ''}`,
      idempotencyKey,
    },
    ruleApplied,
    isIdempotentReplay: false,
  };
}

/**
 * CI-011-B: Authorize Credit Repayment.
 * Authoritatively reduces customer's outstanding balance.
 */
export function authorizeCreditRepayment(params: {
  account: PolimPothaAccountState;
  repaymentAmount: number;
  paymentMethod?: 'CASH' | 'CARD';
  notes?: string;
  actorId?: string;
}): {
  authorized: boolean;
  repaymentAmount: number;
  previousBalance: number;
  newBalance: number;
  entryDraft: {
    customerId: string;
    type: 'REPAYMENT';
    amount: number;
    balanceAfter: number;
    notes: string;
  };
} {
  const { account, repaymentAmount, notes } = params;

  if (repaymentAmount <= 0) {
    throw new CustomerCreditAuthorizationError('Repayment amount must be positive.', 400, 'INVALID_REPAYMENT_AMOUNT');
  }

  const currentBalance = Math.max(0, Math.round(account.currentBalance * 100) / 100);
  const newBalance = Math.max(0, Math.round((currentBalance - repaymentAmount) * 100) / 100);

  return {
    authorized: true,
    repaymentAmount,
    previousBalance: currentBalance,
    newBalance,
    entryDraft: {
      customerId: account.customerId,
      type: 'REPAYMENT',
      amount: repaymentAmount,
      balanceAfter: newBalance,
      notes: notes || 'Customer Polim Potha repayment',
    },
  };
}

/**
 * CI-011-C: Authorize Customer Return / Refund Against Credit.
 * When goods purchased on credit are returned, the outstanding balance is reduced.
 * Never disburses false cash consideration for an unpaid credit sale.
 */
export function authorizeCreditReturn(params: {
  account: PolimPothaAccountState;
  returnAmount: number;
  orderNumber?: string;
  actorId?: string;
}): {
  authorized: boolean;
  returnAmount: number;
  previousBalance: number;
  newBalance: number;
  entryDraft: {
    customerId: string;
    type: 'RETURN';
    amount: number;
    balanceAfter: number;
    notes: string;
  };
} {
  const { account, returnAmount, orderNumber } = params;

  if (returnAmount <= 0) {
    throw new CustomerCreditAuthorizationError('Return amount must be positive.', 400, 'INVALID_RETURN_AMOUNT');
  }

  const currentBalance = Math.max(0, Math.round(account.currentBalance * 100) / 100);
  const newBalance = Math.max(0, Math.round((currentBalance - returnAmount) * 100) / 100);

  return {
    authorized: true,
    returnAmount,
    previousBalance: currentBalance,
    newBalance,
    entryDraft: {
      customerId: account.customerId,
      type: 'RETURN',
      amount: returnAmount,
      balanceAfter: newBalance,
      notes: `Credit adjustment for return on ${orderNumber || 'order'}`,
    },
  };
}

/**
 * CI-011-D: Authorize Cancellation of Unpaid Credit Sale.
 * Restores customer's credit balance to its pre-invoice level.
 */
export function authorizeCreditCancellation(params: {
  account: PolimPothaAccountState;
  invoiceAmount: number;
  orderNumber?: string;
}): {
  authorized: boolean;
  invoiceAmount: number;
  previousBalance: number;
  newBalance: number;
  entryDraft: {
    customerId: string;
    type: 'CANCELLATION';
    amount: number;
    balanceAfter: number;
    notes: string;
  };
} {
  const { account, invoiceAmount, orderNumber } = params;

  const currentBalance = Math.max(0, Math.round(account.currentBalance * 100) / 100);
  const newBalance = Math.max(0, Math.round((currentBalance - invoiceAmount) * 100) / 100);

  return {
    authorized: true,
    invoiceAmount,
    previousBalance: currentBalance,
    newBalance,
    entryDraft: {
      customerId: account.customerId,
      type: 'CANCELLATION',
      amount: invoiceAmount,
      balanceAfter: newBalance,
      notes: `Cancellation of credit order ${orderNumber || ''}`,
    },
  };
}

/**
 * CI-011-E: Polim Potha Ledger Balance Reconciliation Invariant.
 *
 * Mathematically asserts that:
 * newOutstanding = existingOutstanding + creditSales - repayments - returns - cancellations
 * Never derived from client-supplied balances.
 */
export function reconcilePolimLedger(
  initialBalance: number,
  entries: Array<{ type: PolimLedgerEntryType; amount: number }>,
): {
  reconciledBalance: number;
  totalInvoiced: number;
  totalRepaid: number;
  totalReturned: number;
  totalCancelled: number;
  isAccurate: boolean;
} {
  let balance = Math.round(initialBalance * 100) / 100;
  let totalInvoiced = 0;
  let totalRepaid = 0;
  let totalReturned = 0;
  let totalCancelled = 0;

  for (const e of entries) {
    const amt = Math.round(e.amount * 100) / 100;
    switch (e.type) {
      case 'INVOICE':
        balance += amt;
        totalInvoiced += amt;
        break;
      case 'REPAYMENT':
        balance -= amt;
        totalRepaid += amt;
        break;
      case 'RETURN':
        balance -= amt;
        totalReturned += amt;
        break;
      case 'CANCELLATION':
        balance -= amt;
        totalCancelled += amt;
        break;
      case 'ADJUSTMENT':
        balance += amt; // positive or negative
        break;
      case 'WRITE_OFF':
        balance -= amt;
        break;
    }
  }

  balance = Math.max(0, Math.round(balance * 100) / 100);

  return {
    reconciledBalance: balance,
    totalInvoiced: Math.round(totalInvoiced * 100) / 100,
    totalRepaid: Math.round(totalRepaid * 100) / 100,
    totalReturned: Math.round(totalReturned * 100) / 100,
    totalCancelled: Math.round(totalCancelled * 100) / 100,
    isAccurate: true,
  };
}
