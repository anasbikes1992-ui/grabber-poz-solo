/**
 * GRABBER BUSINESS OS — FINANCIAL ACCOUNTING ENGINE
 * General Ledger, Chart of Accounts & Immutable Double-Entry Posting
 */

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface Account {
  id: string;
  code: string; // e.g. "1010"
  name: string;
  type: AccountType;
}

export interface JournalLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: Date;
  referenceType?: string; // 'SALE', 'PAYMENT', 'PURCHASE', 'EXPENSE', 'POLIM_POTHA', 'REFUND'
  referenceId?: string;
  description: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  createdBy?: string;
  createdAt: Date;
}

export class UnbalancedJournalEntryError extends Error {
  constructor(entryNumber: string, totalDebit: number, totalCredit: number) {
    super(`Unbalanced journal entry ${entryNumber}: Total Debit (${totalDebit.toFixed(2)}) != Total Credit (${totalCredit.toFixed(2)}).`);
    this.name = 'UnbalancedJournalEntryError';
  }
}

export const STANDARD_CHART_OF_ACCOUNTS: Record<string, Account> = {
  CASH: { id: 'acc_1010', code: '1010', name: 'Cash on Hand', type: 'ASSET' },
  BANK: { id: 'acc_1020', code: '1020', name: 'Bank Account / Card Clearing', type: 'ASSET' },
  SALES_CLEARING: { id: 'acc_1090', code: '1090', name: 'Sales Order Clearing', type: 'ASSET' },
  ACCOUNTS_RECEIVABLE: { id: 'acc_1100', code: '1100', name: 'Accounts Receivable (Polim Potha)', type: 'ASSET' },
  INVENTORY_ASSET: { id: 'acc_1200', code: '1200', name: 'Inventory Asset', type: 'ASSET' },
  ACCOUNTS_PAYABLE: { id: 'acc_2000', code: '2000', name: 'Accounts Payable (Suppliers)', type: 'LIABILITY' },
  TAX_PAYABLE: { id: 'acc_2100', code: '2100', name: 'Tax Payable (VAT / Sales Tax)', type: 'LIABILITY' },
  OWNERS_EQUITY: { id: 'acc_3000', code: '3000', name: "Owner's Capital", type: 'EQUITY' },
  SALES_REVENUE: { id: 'acc_4000', code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
  COST_OF_GOODS_SOLD: { id: 'acc_5000', code: '5000', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE' },
  OPERATING_EXPENSE: { id: 'acc_6000', code: '6000', name: 'Operating Expenses', type: 'EXPENSE' },
};

export class AccountingEngine {
  private accounts: Map<string, Account> = new Map();
  private entries: JournalEntry[] = [];

  constructor() {
    Object.values(STANDARD_CHART_OF_ACCOUNTS).forEach((acc) => {
      this.accounts.set(acc.code, acc);
      this.accounts.set(acc.id, acc);
    });
  }

  public getAccount(codeOrId: string): Account | undefined {
    return this.accounts.get(codeOrId);
  }

  /**
   * Posts an atomic double-entry journal entry.
   * Throws UnbalancedJournalEntryError if sum(Debits) != sum(Credits).
   */
  public postJournalEntry(params: {
    entryNumber: string;
    description: string;
    lines: Array<{ accountCode: string; debit: number; credit: number; memo?: string }>;
    entryDate?: Date;
    referenceType?: string;
    referenceId?: string;
    createdBy?: string;
  }): JournalEntry {
    const { entryNumber, description, lines, entryDate, referenceType, referenceId, createdBy } = params;

    let totalDebit = 0;
    let totalCredit = 0;

    const formattedLines: JournalLine[] = lines.map((l) => {
      const acc = this.getAccount(l.accountCode);
      if (!acc) {
        throw new Error(`Account code "${l.accountCode}" not found in Chart of Accounts.`);
      }

      const debit = Math.round(Math.max(0, l.debit) * 100) / 100;
      const credit = Math.round(Math.max(0, l.credit) * 100) / 100;

      totalDebit += debit;
      totalCredit += credit;

      return {
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        debit,
        credit,
        memo: l.memo,
      };
    });

    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;

    // Strict Double-Entry Invariant
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new UnbalancedJournalEntryError(entryNumber, totalDebit, totalCredit);
    }

    const entry: JournalEntry = {
      id: `je_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      entryNumber,
      entryDate: entryDate || new Date(),
      referenceType,
      referenceId,
      description,
      lines: formattedLines,
      totalDebit,
      totalCredit,
      createdBy,
      createdAt: new Date(),
    };

    this.entries.push(entry);
    return entry;
  }

  /**
   * Helper: Record Order Invoicing & Revenue Realization.
   * Dr Sales Clearing (1090) [Grand Total]
   * Cr Sales Revenue (4000) [Net Sales]
   * Cr Tax Payable (2100) [Tax]
   * Dr COGS (5000) [Cost]
   * Cr Inventory Asset (1200) [Cost]
   */
  public recordOrderInvoice(params: {
    orderNumber: string;
    netSales: number;
    taxAmount: number;
    grandTotal: number;
    totalCost: number;
    orderId: string;
    createdBy?: string;
  }): JournalEntry {
    const { orderNumber, netSales, taxAmount, grandTotal, totalCost, orderId, createdBy } = params;

    const lines: Array<{ accountCode: string; debit: number; credit: number; memo?: string }> = [
      { accountCode: '1090', debit: grandTotal, credit: 0, memo: `Order Invoice Receivable ${orderNumber}` },
      { accountCode: '4000', debit: 0, credit: netSales, memo: 'Net Sales Revenue' },
    ];

    if (taxAmount > 0) {
      lines.push({ accountCode: '2100', debit: 0, credit: taxAmount, memo: 'Tax Collected' });
    }

    if (totalCost > 0) {
      lines.push({ accountCode: '5000', debit: totalCost, credit: 0, memo: 'Cost of Goods Sold' });
      lines.push({ accountCode: '1200', debit: 0, credit: totalCost, memo: 'Inventory Asset Outflow' });
    }

    return this.postJournalEntry({
      entryNumber: `JE-INV-${orderNumber}`,
      description: `Invoice for Order ${orderNumber}`,
      lines,
      referenceType: 'SALE',
      referenceId: orderId,
      createdBy,
    });
  }

  /**
   * Helper: Record Tender Payment for an Order.
   * Dr Tender Account (1010 Cash, 1020 Bank, 1100 AR Credit)
   * Cr Sales Clearing (1090)
   */
  public recordPaymentTender(params: {
    orderNumber: string;
    paymentMethod: 'CASH' | 'CARD' | 'CREDIT' | 'COD' | 'ONLINE';
    amount: number;
    orderId: string;
    paymentIndex: number;
    createdBy?: string;
  }): JournalEntry {
    const { orderNumber, paymentMethod, amount, orderId, paymentIndex, createdBy } = params;

    const debitAccountCode =
      paymentMethod === 'CASH' || paymentMethod === 'COD'
        ? '1010'
        : paymentMethod === 'CREDIT'
        ? '1100'
        : '1020';

    return this.postJournalEntry({
      entryNumber: `JE-PAY-${orderNumber}-${paymentIndex}`,
      description: `Payment for ${orderNumber} via ${paymentMethod}`,
      lines: [
        { accountCode: debitAccountCode, debit: amount, credit: 0, memo: `Tender: ${paymentMethod}` },
        { accountCode: '1090', debit: 0, credit: amount, memo: `Clearing against Order ${orderNumber}` },
      ],
      referenceType: 'PAYMENT',
      referenceId: orderId,
      createdBy,
    });
  }

  /**
   * Helper: Record Goods Receipt from Supplier on Credit.
   * Dr Inventory Asset
   * Cr Accounts Payable
   */
  public recordPurchaseGRN(params: {
    poNumber: string;
    totalCost: number;
    poId: string;
    supplierName: string;
    createdBy?: string;
  }): JournalEntry {
    const { poNumber, totalCost, poId, supplierName, createdBy } = params;

    return this.postJournalEntry({
      entryNumber: `JE-GRN-${poNumber}`,
      description: `GRN for PO ${poNumber} from ${supplierName}`,
      lines: [
        { accountCode: '1200', debit: totalCost, credit: 0, memo: 'Inventory Received' },
        { accountCode: '2000', debit: 0, credit: totalCost, memo: `Payable to ${supplierName}` },
      ],
      referenceType: 'PURCHASE',
      referenceId: poId,
      createdBy,
    });
  }

  /**
   * Helper: Record Customer Repayment for Polim Potha credit.
   * Dr Cash / Bank
   * Cr Accounts Receivable
   */
  public recordCustomerRepayment(params: {
    receiptNumber: string;
    amount: number;
    customerId: string;
    paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER';
    createdBy?: string;
  }): JournalEntry {
    const { receiptNumber, amount, customerId, paymentMethod, createdBy } = params;
    const debitCode = paymentMethod === 'CASH' ? '1010' : '1020';

    return this.postJournalEntry({
      entryNumber: `JE-REPAY-${receiptNumber}`,
      description: `Polim Potha Repayment ${receiptNumber}`,
      lines: [
        { accountCode: debitCode, debit: amount, credit: 0, memo: `Repayment received via ${paymentMethod}` },
        { accountCode: '1100', debit: 0, credit: amount, memo: `AR reduction for Customer ${customerId}` },
      ],
      referenceType: 'POLIM_POTHA',
      referenceId: customerId,
      createdBy,
    });
  }

  public getEntries(): JournalEntry[] {
    return [...this.entries];
  }

  /**
   * Verifies the Universal Double-Entry Invariant across all journal entries:
   * sum(all debits) === sum(all credits)
   */
  public verifyUniversalAccountingInvariant(): {
    isValid: boolean;
    totalDebits: number;
    totalCredits: number;
    difference: number;
    entryCount: number;
  } {
    let grandDebits = 0;
    let grandCredits = 0;

    for (const entry of this.entries) {
      grandDebits += entry.totalDebit;
      grandCredits += entry.totalCredit;
    }

    grandDebits = Math.round(grandDebits * 100) / 100;
    grandCredits = Math.round(grandCredits * 100) / 100;
    const diff = Math.abs(grandDebits - grandCredits);

    return {
      isValid: diff < 0.001,
      totalDebits: grandDebits,
      totalCredits: grandCredits,
      difference: diff,
      entryCount: this.entries.length,
    };
  }
}

export const defaultAccountingEngine = new AccountingEngine();
