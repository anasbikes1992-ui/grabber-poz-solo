/**
 * GRABBER BUSINESS OS — POLIM POTHA (CUSTOMER CREDIT & AR) ENGINE
 * Accounts Receivable Subsystem, Credit Approvals, Aging Analysis & Invariants
 */

export type PolimPothaEntryType = 'INVOICE' | 'REPAYMENT' | 'ADJUSTMENT' | 'WRITE_OFF';

export interface CustomerCreditAccount {
  customerId: string;
  customerName: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number; // Derived: max(0, creditLimit - currentBalance)
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
}

export interface PolimPothaEntry {
  id: string;
  customerId: string;
  orderId?: string;
  type: PolimPothaEntryType;
  amount: number;
  balanceAfter: number;
  dueDate?: Date;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
}

export interface CreditApprovalDecision {
  approved: boolean;
  requiresManagerOverride: boolean;
  currentBalance: number;
  creditLimit: number;
  availableCredit: number;
  postSaleBalance: number;
  reason?: string;
}

export interface AgingReport {
  customerId: string;
  totalOutstanding: number;
  days0to30: number;
  days31to60: number;
  days61to90: number;
  days90Plus: number;
}

export class CreditEngine {
  private accounts: Map<string, CustomerCreditAccount> = new Map();
  private entries: PolimPothaEntry[] = [];

  public getAccount(customerId: string, fallbackName: string = 'Unknown Customer', defaultLimit: number = 0): CustomerCreditAccount {
    let account = this.accounts.get(customerId);
    if (!account) {
      account = {
        customerId,
        customerName: fallbackName,
        creditLimit: defaultLimit,
        currentBalance: 0,
        availableCredit: defaultLimit,
        status: 'ACTIVE',
      };
      this.accounts.set(customerId, account);
    }
    account.availableCredit = Math.max(0, account.creditLimit - account.currentBalance);
    return { ...account };
  }

  public setAccount(account: CustomerCreditAccount) {
    account.availableCredit = Math.max(0, account.creditLimit - account.currentBalance);
    this.accounts.set(account.customerId, { ...account });
  }

  /**
   * Evaluates whether a customer can make a purchase on credit.
   * If the purchase exceeds the credit limit, it flags `requiresManagerOverride: true`.
   */
  public evaluateCreditApproval(params: {
    customerId: string;
    saleAmount: number;
    userRole: string; // 'OWNER' | 'ADMIN' | 'MANAGER' | 'CASHIER'
  }): CreditApprovalDecision {
    const { customerId, saleAmount, userRole } = params;
    const account = this.getAccount(customerId);

    if (account.status === 'BLOCKED') {
      return {
        approved: false,
        requiresManagerOverride: true,
        currentBalance: account.currentBalance,
        creditLimit: account.creditLimit,
        availableCredit: account.availableCredit,
        postSaleBalance: account.currentBalance + saleAmount,
        reason: 'Customer credit account is BLOCKED.',
      };
    }

    const postSaleBalance = account.currentBalance + saleAmount;
    const withinLimit = postSaleBalance <= account.creditLimit;

    if (withinLimit) {
      return {
        approved: true,
        requiresManagerOverride: false,
        currentBalance: account.currentBalance,
        creditLimit: account.creditLimit,
        availableCredit: account.availableCredit,
        postSaleBalance,
      };
    }

    // Exceeds credit limit: check if user has override authority
    const hasOverrideAuth = ['OWNER', 'ADMIN', 'MANAGER'].includes(userRole.toUpperCase());

    return {
      approved: hasOverrideAuth,
      requiresManagerOverride: !hasOverrideAuth,
      currentBalance: account.currentBalance,
      creditLimit: account.creditLimit,
      availableCredit: account.availableCredit,
      postSaleBalance,
      reason: hasOverrideAuth
        ? `Sale approved via ${userRole} override (Exceeds limit by LKR ${(postSaleBalance - account.creditLimit).toFixed(2)})`
        : `Sale exceeds available credit by LKR ${(postSaleBalance - account.creditLimit).toFixed(2)}. Manager override required.`,
    };
  }

  /**
   * Posts an immutable credit transaction entry (Invoice on credit, repayment, adjustment).
   */
  public postEntry(params: {
    customerId: string;
    type: PolimPothaEntryType;
    amount: number; // positive number
    orderId?: string;
    dueDate?: Date;
    notes?: string;
    createdBy?: string;
  }): { account: CustomerCreditAccount; entry: PolimPothaEntry } {
    const { customerId, type, amount, orderId, dueDate, notes, createdBy } = params;
    const account = this.accounts.get(customerId) || this.getAccount(customerId);

    let balanceDelta = 0;
    if (type === 'INVOICE') {
      balanceDelta = amount; // Increases receivable
    } else if (type === 'REPAYMENT' || type === 'WRITE_OFF') {
      balanceDelta = -amount; // Decreases receivable
    } else if (type === 'ADJUSTMENT') {
      balanceDelta = amount; // Can be positive or negative
    }

    account.currentBalance = Math.round((account.currentBalance + balanceDelta) * 100) / 100;
    account.availableCredit = Math.max(0, account.creditLimit - account.currentBalance);

    const entry: PolimPothaEntry = {
      id: `ppe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      customerId,
      orderId,
      type,
      amount,
      balanceAfter: account.currentBalance,
      dueDate,
      notes,
      createdBy,
      createdAt: new Date(),
    };

    this.entries.push(entry);

    return {
      account: { ...account },
      entry,
    };
  }

  public getEntries(customerId?: string): PolimPothaEntry[] {
    if (!customerId) return [...this.entries];
    return this.entries.filter((e) => e.customerId === customerId);
  }

  /**
   * Computes Aging Analysis (0–30, 31–60, 61–90, 90+ days) for a customer's outstanding invoices.
   */
  public getAgingReport(customerId: string, asOfDate: Date = new Date()): AgingReport {
    const account = this.getAccount(customerId);
    const customerEntries = this.getEntries(customerId);

    let days0to30 = 0;
    let days31to60 = 0;
    let days61to90 = 0;
    let days90Plus = 0;

    const nowMs = asOfDate.getTime();

    // Group invoices and apply repayments FIFO
    const unpaidInvoices: Array<{ amount: number; date: Date }> = [];
    let repaymentPool = 0;

    for (const entry of customerEntries) {
      if (entry.type === 'INVOICE') {
        unpaidInvoices.push({ amount: entry.amount, date: entry.createdAt });
      } else if (entry.type === 'REPAYMENT' || entry.type === 'WRITE_OFF') {
        repaymentPool += entry.amount;
      }
    }

    // Settle oldest invoices first
    for (const inv of unpaidInvoices) {
      if (repaymentPool >= inv.amount) {
        repaymentPool -= inv.amount;
        continue;
      }

      const remainingAmount = inv.amount - repaymentPool;
      repaymentPool = 0;

      const ageInDays = Math.floor((nowMs - inv.date.getTime()) / (1000 * 60 * 60 * 24));

      if (ageInDays <= 30) {
        days0to30 += remainingAmount;
      } else if (ageInDays <= 60) {
        days31to60 += remainingAmount;
      } else if (ageInDays <= 90) {
        days61to90 += remainingAmount;
      } else {
        days90Plus += remainingAmount;
      }
    }

    return {
      customerId,
      totalOutstanding: account.currentBalance,
      days0to30: Math.round(days0to30 * 100) / 100,
      days31to60: Math.round(days31to60 * 100) / 100,
      days61to90: Math.round(days61to90 * 100) / 100,
      days90Plus: Math.round(days90Plus * 100) / 100,
    };
  }

  /**
   * Verifies the Polim Potha Invariant:
   * Opening + Invoices - Repayments - Write-Offs +/- Adjustments = Current Balance
   */
  public verifyCreditInvariant(customerId: string): { isValid: boolean; computedBalance: number; actualBalance: number } {
    const entries = this.getEntries(customerId);
    let computed = 0;

    for (const entry of entries) {
      if (entry.type === 'INVOICE') computed += entry.amount;
      else if (entry.type === 'REPAYMENT' || entry.type === 'WRITE_OFF') computed -= entry.amount;
      else if (entry.type === 'ADJUSTMENT') computed += entry.amount;
    }

    computed = Math.round(computed * 100) / 100;
    const account = this.getAccount(customerId);
    const isValid = computed === account.currentBalance;

    return {
      isValid,
      computedBalance: computed,
      actualBalance: account.currentBalance,
    };
  }
}

export const defaultCreditEngine = new CreditEngine();
