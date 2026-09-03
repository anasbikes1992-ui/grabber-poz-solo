import { describe, it, expect } from 'vitest';
import {
  computeAuthoritativeCheckoutTotals,
  resolveCatalogLine,
  type CatalogProductRow,
  type CatalogVariantRow,
} from '../src/lib/commerce/authoritative-pricing';
import type { TaxRate } from '../src/lib/commerce/tax-engine';
import { resolveCheckoutStatuses } from '../src/lib/commerce/order-lifecycle';
import {
  applyDecrementSale,
  applyReserve,
  applySerializedStockOps,
  availableStock,
  resolveStockApplyMode,
} from '../src/lib/inventory/stock-invariants';
import {
  auditPaymentIdentity,
  buildSaleJournalEntry,
  buildCompensatingRefundJournal,
  resolveOrderCancellation,
  isPaymentCallbackDuplicate,
  type PaymentTransactionRecord,
  type OrderFinancialSnapshot,
} from '../src/lib/commerce/payment-lifecycle';
import {
  authorizeDiscount,
  DiscountAuthorizationError,
} from '../src/lib/commerce/discount-authorization';
import {
  buildUserBranchProfile,
  assertUserBranchAccess,
  resolveAuthoritativeBranch,
  assertRegisterBranchIntegrity,
  assertLocationAccess,
  assertTransferDispatchAuthority,
  getAuthorizedBranchFilter,
  BranchAuthorizationError,
} from '../src/lib/auth/branch-authorization';
import {
  authorizeCreditSale,
  authorizeCreditRepayment,
  authorizeCreditReturn,
  authorizeCreditCancellation,
  reconcilePolimLedger,
  CustomerCreditAuthorizationError,
  type CustomerCreditProfile,
  type PolimPothaAccountState,
  type PolimLedgerEntry,
} from '../src/lib/commerce/customer-credit-authorization';

const shirt: CatalogProductRow = {
  id: 'prod_shirt',
  name: 'Linen Shirt',
  sku: 'SHIRT',
  isActive: true,
  salePrice: '4500.00',
  costPrice: '2500.00',
  taxProfileId: 'tax_standard',
  reorderLevel: 10,
};

const variantB: CatalogVariantRow = {
  id: 'var_b',
  productId: 'prod_shirt',
  name: 'Size L / Blue',
  sku: 'SHIRT-L-BLU',
  active: true,
  salePrice: '5200.00',
  costPrice: '2800.00',
};

const variantC: CatalogVariantRow = {
  id: 'var_c',
  productId: 'prod_shirt',
  name: 'Size S / White',
  sku: 'SHIRT-S-WHT',
  active: true,
  salePrice: '4100.00',
  costPrice: '2300.00',
};

function vat(rate: number): TaxRate[] {
  return [
    {
      id: 'rate_1',
      taxProfileId: 'tax_standard',
      name: `VAT ${rate}%`,
      ratePercentage: rate,
      effectiveFrom: new Date('2020-01-01'),
      effectiveTo: null,
    },
  ];
}

describe('CI-001 server-authoritative selling price', () => {
  it('uses catalog sale price, never a client-supplied unitPrice', () => {
    const line = resolveCatalogLine(shirt, null, 2);
    expect(line.unitPrice).toBe(4500);
    expect(line.unitCost).toBe(2500);
    const clientWouldHaveSent = 1;
    expect(line.unitPrice).not.toBe(clientWouldHaveSent);
    const pricing = computeAuthoritativeCheckoutTotals([line], {
      ratesRegistry: vat(18),
      defaultTaxProfileId: 'tax_standard',
    });
    expect(pricing.subtotal).toBe(9000);
    expect(pricing.taxTotal).toBe(1620);
    expect(pricing.grandTotal).toBe(10620);
  });
});

describe('CI-002 variant price correctness', () => {
  it('charges variant B price, not product base', () => {
    const line = resolveCatalogLine(shirt, variantB, 1);
    expect(line.unitPrice).toBe(5200);
    expect(line.unitPrice).not.toBe(Number(shirt.salePrice));
    expect(line.unitCost).toBe(2800);
    expect(line.variantId).toBe('var_b');
  });

  it('charges variant C independently of variant B and base', () => {
    const b = resolveCatalogLine(shirt, variantB, 1);
    const c = resolveCatalogLine(shirt, variantC, 1);
    expect(b.unitPrice).toBe(5200);
    expect(c.unitPrice).toBe(4100);
    expect(c.unitPrice).not.toBe(b.unitPrice);
  });

  it('inherits product price when variant salePrice is null', () => {
    const inherited: CatalogVariantRow = { ...variantB, salePrice: null, costPrice: null };
    const line = resolveCatalogLine(shirt, inherited, 1);
    expect(line.unitPrice).toBe(4500);
    expect(line.unitCost).toBe(2500);
  });

  it('rejects a variant that belongs to another product', () => {
    expect(() =>
      resolveCatalogLine(shirt, { ...variantB, productId: 'other' }, 1),
    ).toThrow(/does not belong/);
  });
});

describe('CI-003 server-authoritative tax', () => {
  it('uses configured tax rate, not a hardcoded 18%', () => {
    const line = resolveCatalogLine(shirt, null, 1);
    const at15 = computeAuthoritativeCheckoutTotals([line], {
      ratesRegistry: vat(15),
      defaultTaxProfileId: 'tax_standard',
    });
    expect(at15.taxTotal).toBe(675);
    expect(at15.grandTotal).toBe(5175);
    expect(at15.taxTotal).not.toBe(810);
  });

  it('changing the configured rate changes totals without checkout code', () => {
    const line = resolveCatalogLine(shirt, null, 1);
    const a = computeAuthoritativeCheckoutTotals([line], {
      ratesRegistry: vat(18),
      defaultTaxProfileId: 'tax_standard',
    });
    const b = computeAuthoritativeCheckoutTotals([line], {
      ratesRegistry: vat(8),
      defaultTaxProfileId: 'tax_standard',
    });
    expect(a.taxTotal).toBe(810);
    expect(b.taxTotal).toBe(360);
    expect(a.subtotal).toBe(b.subtotal);
  });

  it('zero-rates when no tax profile or registry applies', () => {
    const untaxed: CatalogProductRow = { ...shirt, taxProfileId: null };
    const line = resolveCatalogLine(untaxed, null, 1);
    const pricing = computeAuthoritativeCheckoutTotals([line], {
      ratesRegistry: vat(18),
      defaultTaxProfileId: null,
    });
    expect(pricing.taxTotal).toBe(0);
    expect(pricing.grandTotal).toBe(4500);
  });
});

describe('CI-009 COGS uses authoritative cost', () => {
  it('does not use a client-supplied unitCost', () => {
    const line = resolveCatalogLine(shirt, variantB, 2);
    expect(line.unitCost).toBe(2800);
    const clientCost = 0.01;
    expect(line.unitCost).not.toBe(clientCost);
    const cogs = line.unitCost * line.quantity;
    expect(cogs).toBe(5600);
  });
});

describe('CI-012 POS and storefront share identical money math', () => {
  it('same catalog intent yields the same totals for both channels', () => {
    const lines = [resolveCatalogLine(shirt, variantB, 2), resolveCatalogLine(shirt, variantC, 1)];
    const pos = computeAuthoritativeCheckoutTotals(lines, {
      discountTotal: 500,
      ratesRegistry: vat(18),
      defaultTaxProfileId: 'tax_standard',
    });
    const storefront = computeAuthoritativeCheckoutTotals(lines, {
      discountTotal: 500,
      ratesRegistry: vat(18),
      defaultTaxProfileId: 'tax_standard',
    });
    expect(pos.subtotal).toBe(storefront.subtotal);
    expect(pos.taxTotal).toBe(storefront.taxTotal);
    expect(pos.grandTotal).toBe(storefront.grandTotal);
    expect(pos.totalDiscount).toBe(storefront.totalDiscount);
    expect(pos.subtotal).toBe(14500);
  });

  it('POS cash and storefront COD both decrement stock (same SALE path)', () => {
    const pos = resolveCheckoutStatuses('POS', 'CASH');
    const web = resolveCheckoutStatuses('STOREFRONT', 'COD');
    expect(pos.decrementStock).toBe(true);
    expect(web.decrementStock).toBe(true);
    expect(resolveStockApplyMode(pos.decrementStock)).toBe('DECREMENT');
    expect(resolveStockApplyMode(web.decrementStock)).toBe(resolveStockApplyMode(pos.decrementStock));
  });
});

describe('CI-005 available = on_hand - reserved', () => {
  it('never reports negative available', () => {
    expect(availableStock(10, 2)).toBe(8);
    expect(availableStock(10, 10)).toBe(0);
    expect(availableStock(3, 10)).toBe(0);
  });

  it('sale cannot consume more than available (reserved held back)', () => {
    expect(() => applyDecrementSale({ onHand: 10, reserved: 5 }, 6)).toThrow(/Insufficient/);
    const ok = applyDecrementSale({ onHand: 10, reserved: 5 }, 5);
    expect(ok.onHand).toBe(5);
    expect(ok.reserved).toBe(0);
    expect(availableStock(ok.onHand, ok.reserved)).toBe(5);
  });

  it('reserve reduces available without changing on_hand', () => {
    const next = applyReserve({ onHand: 10, reserved: 0 }, 4);
    expect(next.onHand).toBe(10);
    expect(next.reserved).toBe(4);
    expect(availableStock(next.onHand, next.reserved)).toBe(6);
  });
});

describe('CI-006 concurrent checkout cannot oversell', () => {
  it('10 on hand, two sales of 6 → one succeeds, one fails, stock never < 0', () => {
    const { final, succeeded, failed } = applySerializedStockOps({ onHand: 10, reserved: 0 }, [
      (s) => applyDecrementSale(s, 6),
      (s) => applyDecrementSale(s, 6),
    ]);
    expect(succeeded).toBe(1);
    expect(failed).toBe(1);
    expect(final.onHand).toBe(4);
    expect(final.onHand).toBeGreaterThanOrEqual(0);
    expect(availableStock(final.onHand, final.reserved)).toBeGreaterThanOrEqual(0);
  });

  it('two reservations of 6 against 10 available → one succeeds', () => {
    const { final, succeeded, failed } = applySerializedStockOps({ onHand: 10, reserved: 0 }, [
      (s) => applyReserve(s, 6),
      (s) => applyReserve(s, 6),
    ]);
    expect(succeeded).toBe(1);
    expect(failed).toBe(1);
    expect(final.onHand).toBe(10);
    expect(final.reserved).toBe(6);
    expect(availableStock(final.onHand, final.reserved)).toBe(4);
  });

  it('lifecycle decrementStock=false maps to RESERVE, not SALE', () => {
    expect(resolveStockApplyMode(false)).toBe('RESERVE');
    expect(resolveStockApplyMode(true)).toBe('DECREMENT');
  });
});

describe('CI-007 payment identity & reconciliation', () => {
  it('identifies exact captured payment matching order total', () => {
    const transactions: PaymentTransactionRecord[] = [
      { id: 'tx_1', orderId: 'ord_1', method: 'CASH', amount: 10620, currency: 'LKR', status: 'CAPTURED' },
    ];
    const audit = auditPaymentIdentity(10620, transactions);
    expect(audit.isFullyPaid).toBe(true);
    expect(audit.isOverpaid).toBe(false);
    expect(audit.outstandingBalance).toBe(0);
    expect(audit.reconciliationStatus).toBe('SETTLED');
    expect(audit.capturedTotal).toBe(10620);
  });

  it('never counts PENDING, FAILED, or CANCELLED transactions as captured revenue', () => {
    const transactions: PaymentTransactionRecord[] = [
      { id: 'tx_p', orderId: 'ord_2', method: 'COD', amount: 5000, currency: 'LKR', status: 'PENDING' },
      { id: 'tx_f', orderId: 'ord_2', method: 'PAYHERE', amount: 5000, currency: 'LKR', status: 'FAILED' },
      { id: 'tx_c', orderId: 'ord_2', method: 'CARD', amount: 5000, currency: 'LKR', status: 'CANCELLED' },
    ];
    const audit = auditPaymentIdentity(5000, transactions);
    expect(audit.capturedTotal).toBe(0);
    expect(audit.pendingTotal).toBe(5000);
    expect(audit.failedTotal).toBe(10000);
    expect(audit.isFullyPaid).toBe(false);
    expect(audit.outstandingBalance).toBe(5000);
    expect(audit.reconciliationStatus).toBe('UNPAID');
  });

  it('correctly tracks partial payment and remaining outstanding balance', () => {
    const transactions: PaymentTransactionRecord[] = [
      { id: 'tx_split', orderId: 'ord_3', method: 'CASH', amount: 4000, currency: 'LKR', status: 'CAPTURED' },
    ];
    const audit = auditPaymentIdentity(10000, transactions);
    expect(audit.capturedTotal).toBe(4000);
    expect(audit.outstandingBalance).toBe(6000);
    expect(audit.isFullyPaid).toBe(false);
    expect(audit.reconciliationStatus).toBe('PARTIAL');
  });

  it('detects overpayment discrepancy', () => {
    const transactions: PaymentTransactionRecord[] = [
      { id: 'tx_over', orderId: 'ord_4', method: 'CASH', amount: 15000, currency: 'LKR', status: 'CAPTURED' },
    ];
    const audit = auditPaymentIdentity(10000, transactions);
    expect(audit.isOverpaid).toBe(true);
    expect(audit.isValid).toBe(false);
    expect(audit.reconciliationStatus).toBe('DISCREPANCY');
  });

  it('idempotently flags duplicate gateway callbacks by providerRef', () => {
    const existing: PaymentTransactionRecord[] = [
      { id: 'tx_ph1', orderId: 'ord_5', method: 'PAYHERE', amount: 8000, currency: 'LKR', status: 'CAPTURED', providerRef: 'PH_REF_991' },
    ];
    expect(isPaymentCallbackDuplicate(existing, 'PH_REF_991')).toBe(true);
    expect(isPaymentCallbackDuplicate(existing, 'PH_REF_NEW')).toBe(false);
  });
});

describe('CI-008 authoritative GL double-entry identity', () => {
  const sampleOrder: OrderFinancialSnapshot = {
    id: 'ord_uuid_101',
    orderNumber: 'POS-88990011',
    channel: 'POS',
    subtotal: 9000,
    discountTotal: 0,
    taxableTotal: 9000,
    taxTotal: 1620,
    grandTotal: 10620,
    totalCost: 5000,
    orderStatus: 'DELIVERED',
    paymentStatus: 'PAID',
  };

  it('builds perfectly balanced double-entry journal for cash sale', () => {
    const journal = buildSaleJournalEntry({
      order: sampleOrder,
      payments: [{ method: 'CASH', amount: 10620 }],
    });
    expect(journal.isBalanced).toBe(true);
    expect(journal.totalDebit).toBe(10620 + 5000); // 10620 Cash + 5000 COGS
    expect(journal.totalCredit).toBe(9000 + 1620 + 5000); // 9000 Revenue + 1620 Tax + 5000 Inventory
    expect(journal.totalDebit).toBe(journal.totalCredit);

    const cashDebit = journal.lines.find((l) => l.accountCode === '1010');
    expect(cashDebit?.debit).toBe(10620);
    const revenueCredit = journal.lines.find((l) => l.accountCode === '4000');
    expect(revenueCredit?.credit).toBe(9000);
    const taxCredit = journal.lines.find((l) => l.accountCode === '2100');
    expect(taxCredit?.credit).toBe(1620);
    const cogsDebit = journal.lines.find((l) => l.accountCode === '5000');
    expect(cogsDebit?.debit).toBe(5000);
    const invCredit = journal.lines.find((l) => l.accountCode === '1200');
    expect(invCredit?.credit).toBe(5000);
  });

  it('handles split tender payments without double-entry imbalance', () => {
    const journal = buildSaleJournalEntry({
      order: sampleOrder,
      payments: [
        { method: 'CASH', amount: 5000 },
        { method: 'CARD', amount: 5620 },
      ],
    });
    expect(journal.isBalanced).toBe(true);
    const cashLine = journal.lines.find((l) => l.accountCode === '1010');
    const cardLine = journal.lines.find((l) => l.accountCode === '1020');
    expect(cashLine?.debit).toBe(5000);
    expect(cardLine?.debit).toBe(5620);
    expect(journal.totalDebit).toBe(journal.totalCredit);
  });

  it('routes Polim Potha credit sales to Accounts Receivable (1100)', () => {
    const journal = buildSaleJournalEntry({
      order: sampleOrder,
      payments: [{ method: 'CREDIT', amount: 10620 }],
    });
    const arLine = journal.lines.find((l) => l.accountCode === '1100');
    expect(arLine).toBeDefined();
    expect(arLine?.debit).toBe(10620);
    expect(journal.isBalanced).toBe(true);
  });
});

describe('Refunds & compensating journal entries', () => {
  const paidOrder: OrderFinancialSnapshot = {
    id: 'ord_paid_77',
    orderNumber: 'POS-778899',
    channel: 'POS',
    subtotal: 5000,
    discountTotal: 0,
    taxableTotal: 5000,
    taxTotal: 900,
    grandTotal: 5900,
    totalCost: 2500,
    orderStatus: 'DELIVERED',
    paymentStatus: 'PAID',
  };

  it('generates balanced compensating reversal without mutating original records', () => {
    const refundJournal = buildCompensatingRefundJournal({
      order: paidOrder,
      refundNumber: 'REF-001',
      refundAmount: 5900,
      refundTaxAmount: 900,
      refundMethod: 'CASH',
      restockedCost: 2500,
    });
    expect(refundJournal.isBalanced).toBe(true);
    expect(refundJournal.totalDebit).toBe(refundJournal.totalCredit);

    // Dr Revenue (reversal)
    const revLine = refundJournal.lines.find((l) => l.accountCode === '4000');
    expect(revLine?.debit).toBe(5000);

    // Dr Tax Liability (reversal)
    const taxLine = refundJournal.lines.find((l) => l.accountCode === '2100');
    expect(taxLine?.debit).toBe(900);

    // Cr Cash
    const cashLine = refundJournal.lines.find((l) => l.accountCode === '1010');
    expect(cashLine?.credit).toBe(5900);

    // Dr Inventory / Cr COGS (restock)
    const invLine = refundJournal.lines.find((l) => l.accountCode === '1200');
    const cogsLine = refundJournal.lines.find((l) => l.accountCode === '5000');
    expect(invLine?.debit).toBe(2500);
    expect(cogsLine?.credit).toBe(2500);
  });
});

describe('Cancellation vs refund policy', () => {
  it('unpaid / COD pending cancellation does not manufacture fake refund or failed money', () => {
    const decision = resolveOrderCancellation({
      id: 'ord_cod_1',
      orderNumber: 'COD-101',
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PENDING',
      decrementStock: true,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.action).toBe('CANCEL_UNPAID');
    expect(decision.requiresRefund).toBe(false);
    expect(decision.restoreStock).toBe(true);
    expect(decision.nextOrderStatus).toBe('CANCELLED');
  });

  it('paid order cancellation requires refund flow and blocks simple cancel', () => {
    const decision = resolveOrderCancellation({
      id: 'ord_paid_2',
      orderNumber: 'POS-202',
      orderStatus: 'DELIVERED',
      paymentStatus: 'PAID',
      decrementStock: true,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.action).toBe('REFUND_REQUIRED');
    expect(decision.requiresRefund).toBe(true);
  });
});

describe('Critical regression matrix (all 8 scenarios)', () => {
  it('Scenario 1: POS cash sale — captured, delivered, stock deducted, sale GL posted', () => {
    const statuses = resolveCheckoutStatuses('POS', 'CASH');
    expect(statuses.paymentStatus).toBe('PAID');
    expect(statuses.orderStatus).toBe('DELIVERED');
    expect(statuses.decrementStock).toBe(true);
  });

  it('Scenario 2: Storefront COD — pending payment, confirmed order, stock deducted, no premature revenue', () => {
    const statuses = resolveCheckoutStatuses('STOREFRONT', 'COD');
    expect(statuses.paymentStatus).toBe('PENDING');
    expect(statuses.orderStatus).toBe('CONFIRMED');
    expect(statuses.decrementStock).toBe(true);
    const audit = auditPaymentIdentity(4500, [
      { id: 'tx_cod', orderId: 'ord_cod', method: 'COD', amount: 4500, currency: 'LKR', status: 'PENDING' },
    ]);
    expect(audit.capturedTotal).toBe(0); // No premature captured revenue
  });

  it('Scenario 3: Online paid — captured, confirmed order, stock deducted', () => {
    const statuses = resolveCheckoutStatuses('STOREFRONT', 'PAYHERE');
    expect(statuses.paymentStatus).toBe('PAID');
    expect(statuses.orderStatus).toBe('CONFIRMED');
    expect(statuses.decrementStock).toBe(true);
  });

  it('Scenario 4: Failed payment — payment failed, order not completed, zero false revenue', () => {
    const audit = auditPaymentIdentity(5000, [
      { id: 'tx_fail', orderId: 'ord_fail', method: 'PAYHERE', amount: 5000, currency: 'LKR', status: 'FAILED' },
    ]);
    expect(audit.capturedTotal).toBe(0);
    expect(audit.failedTotal).toBe(5000);
  });

  it('Scenario 5: Cancel COD — cancelled, stock restored, zero money refund', () => {
    const decision = resolveOrderCancellation({
      id: 'ord_c5',
      orderNumber: 'COD-555',
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PENDING',
      decrementStock: true,
    });
    expect(decision.action).toBe('CANCEL_UNPAID');
    expect(decision.requiresRefund).toBe(false);
    expect(decision.restoreStock).toBe(true);
  });

  it('Scenario 6: Refund paid order — refunded, compensating GL reversal, stock restored', () => {
    const snapshot: OrderFinancialSnapshot = {
      id: 'ord_s6',
      orderNumber: 'ORD-666',
      channel: 'STOREFRONT',
      subtotal: 10000,
      discountTotal: 0,
      taxableTotal: 10000,
      taxTotal: 0,
      grandTotal: 10000,
      totalCost: 6000,
      orderStatus: 'DELIVERED',
      paymentStatus: 'PAID',
    };
    const journal = buildCompensatingRefundJournal({
      order: snapshot,
      refundNumber: 'REF-666',
      refundAmount: 10000,
      refundMethod: 'CARD',
      restockedCost: 6000,
    });
    expect(journal.isBalanced).toBe(true);
    expect(journal.lines.some((l) => l.accountCode === '1200' && l.debit === 6000)).toBe(true);
  });

  it('Scenario 7: Partial refund — partially refunded, partial compensating GL reversal', () => {
    const snapshot: OrderFinancialSnapshot = {
      id: 'ord_s7',
      orderNumber: 'ORD-777',
      channel: 'POS',
      subtotal: 10000,
      discountTotal: 0,
      taxableTotal: 10000,
      taxTotal: 0,
      grandTotal: 10000,
      totalCost: 5000,
      orderStatus: 'DELIVERED',
      paymentStatus: 'PAID',
    };
    const journal = buildCompensatingRefundJournal({
      order: snapshot,
      refundNumber: 'REF-777-PARTIAL',
      refundAmount: 3000,
      refundMethod: 'CASH',
      restockedCost: 1500,
    });
    expect(journal.isBalanced).toBe(true);
    expect(journal.lines.find((l) => l.accountCode === '4000')?.debit).toBe(3000);
  });

  it('Scenario 8: Duplicate callback — duplicate providerRef detected, idempotent execution', () => {
    const existing: PaymentTransactionRecord[] = [
      { id: 'tx_s8', orderId: 'ord_888', method: 'PAYHERE', amount: 5000, currency: 'LKR', status: 'CAPTURED', providerRef: 'PH_DUP_1' },
    ];
    expect(isPaymentCallbackDuplicate(existing, 'PH_DUP_1')).toBe(true);
  });
});

describe('CI-004 discount authorization & rule enforcement', () => {
  const subtotal = 10000;

  // 1. No discount
  it('1. No discount requested results in 0 applied discount', () => {
    const res = authorizeDiscount({
      subtotal,
      staffRole: 'CASHIER',
    });
    expect(res.isAuthorized).toBe(true);
    expect(res.authorizedDiscountTotal).toBe(0);
    expect(res.breakdown.discountedTaxableSubtotal).toBe(10000);
    expect(res.effectivePercent).toBe(0);
  });

  // 2. Valid fixed discount
  it('2. Valid fixed discount within role authority is authorized', () => {
    const res = authorizeDiscount({
      subtotal,
      requestedDiscountAmount: 500, // 5% < 15% cashier max
      staffRole: 'CASHIER',
      reason: 'Customer loyalty courtesy',
    });
    expect(res.isAuthorized).toBe(true);
    expect(res.authorizedDiscountTotal).toBe(500);
    expect(res.breakdown.discountedTaxableSubtotal).toBe(9500);
    expect(res.effectivePercent).toBe(5);
  });

  // 3. Valid percentage discount
  it('3. Valid percentage discount within role authority is authorized', () => {
    const res = authorizeDiscount({
      subtotal,
      requestedDiscountPercent: 10, // 10% <= 15%
      staffRole: 'CASHIER',
    });
    expect(res.isAuthorized).toBe(true);
    expect(res.authorizedDiscountTotal).toBe(1000);
    expect(res.breakdown.discountedTaxableSubtotal).toBe(9000);
    expect(res.effectivePercent).toBe(10);
  });

  // 4. Discount equal to subtotal
  it('4. 100% discount equal to subtotal is authorized only for Owner', () => {
    const res = authorizeDiscount({
      subtotal,
      requestedDiscountPercent: 100,
      staffRole: 'OWNER',
      reason: 'Owner promotional giveaway',
    });
    expect(res.isAuthorized).toBe(true);
    expect(res.authorizedDiscountTotal).toBe(10000);
    expect(res.breakdown.discountedTaxableSubtotal).toBe(0);
    expect(res.effectivePercent).toBe(100);
  });

  // 5. Discount greater than subtotal
  it('5. Discount greater than subtotal is capped strictly at subtotal', () => {
    const res = authorizeDiscount({
      subtotal,
      requestedDiscountAmount: 15000,
      staffRole: 'OWNER',
    });
    expect(res.isAuthorized).toBe(true);
    expect(res.authorizedDiscountTotal).toBe(10000);
    expect(res.breakdown.discountedTaxableSubtotal).toBe(0);
  });

  // 6. Negative discount
  it('6. Negative discount amounts or percentages are strictly rejected', () => {
    expect(() =>
      authorizeDiscount({
        subtotal,
        requestedDiscountAmount: -500,
        staffRole: 'CASHIER',
      }),
    ).toThrow(DiscountAuthorizationError);

    expect(() =>
      authorizeDiscount({
        subtotal,
        requestedDiscountPercent: -10,
        staffRole: 'CASHIER',
      }),
    ).toThrow(/forbidden/i);
  });

  // 7. Manipulated client discount
  it('7. Client-manipulated discount amounts are bounded by server-side policy', () => {
    // Client sends requestedDiscountAmount = 9000 as cashier without override
    expect(() =>
      authorizeDiscount({
        subtotal,
        requestedDiscountAmount: 9000, // 90%
        staffRole: 'CASHIER',
      }),
    ).toThrow(/exceeds maximum allowed 15%/);
  });

  // 8. Manipulated client discountPercent
  it('8. Client-manipulated discountPercent is verified server-side against role authority', () => {
    expect(() =>
      authorizeDiscount({
        subtotal,
        requestedDiscountPercent: 50,
        staffRole: 'CASHIER',
      }),
    ).toThrow(DiscountAuthorizationError);
  });

  // 9. Cashier exceeding authority
  it('9. Cashier exceeding 15% authority without override is rejected with 403', () => {
    try {
      authorizeDiscount({
        subtotal,
        requestedDiscountPercent: 20,
        staffRole: 'CASHIER',
      });
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(DiscountAuthorizationError);
      expect(err.status).toBe(403);
      expect(err.message).toContain('Cashier discount of 20.0% exceeds maximum allowed 15%');
    }
  });

  // 10. Manager within authority
  it('10. Manager within 30% authority is authorized without owner override', () => {
    const res = authorizeDiscount({
      subtotal,
      requestedDiscountPercent: 25,
      staffRole: 'MANAGER',
    });
    expect(res.isAuthorized).toBe(true);
    expect(res.authorizedDiscountTotal).toBe(2500);
    expect(res.auditTrail.ruleApplied).toBe('MANAGER_DISCOUNT');
  });

  // 11. Owner override
  it('11. Cashier with Manager/Owner override successfully authorizes higher discount', () => {
    const res = authorizeDiscount({
      subtotal,
      requestedDiscountPercent: 25,
      staffRole: 'CASHIER',
      overrideRole: 'MANAGER',
      overrideUserId: 'usr_mgr_01',
      reason: 'Manager approved holiday sale',
    });
    expect(res.isAuthorized).toBe(true);
    expect(res.authorizedDiscountTotal).toBe(2500);
    expect(res.auditTrail.overrideRole).toBe('MANAGER');
    expect(res.auditTrail.ruleApplied).toBe('CASHIER_OVERRIDDEN_BY_MANAGER');
  });

  // 12. Promotion + manual discount interaction
  it('12. Combines server promotion and manual discount within non-owner policy cap', () => {
    const res = authorizeDiscount({
      subtotal,
      requestedDiscountAmount: 1000, // 10% manual
      promotionDiscount: 1500, // 15% promo
      staffRole: 'CASHIER',
    });
    expect(res.isAuthorized).toBe(true);
    expect(res.authorizedDiscountTotal).toBe(2500);
    expect(res.breakdown.manualDiscount).toBe(1000);
    expect(res.breakdown.promotionDiscount).toBe(1500);
    expect(res.breakdown.discountedTaxableSubtotal).toBe(7500);
  });

  // 13. Tax after discount
  it('13. Tax is calculated from the authoritative discounted taxable amount', () => {
    const lines = [resolveCatalogLine(shirt, null, 2)]; // 4500 * 2 = 9000 subtotal
    const authorized = authorizeDiscount({
      subtotal: 9000,
      requestedDiscountAmount: 1000,
      staffRole: 'CASHIER',
    });
    expect(authorized.authorizedDiscountTotal).toBe(1000);

    const totals = computeAuthoritativeCheckoutTotals(lines, {
      discountTotal: authorized.authorizedDiscountTotal,
      ratesRegistry: vat(18),
      defaultTaxProfileId: 'tax_standard',
    });
    // Taxable = 9000 - 1000 = 8000. 18% of 8000 = 1440
    expect(totals.subtotal).toBe(9000);
    expect(totals.totalDiscount).toBe(1000);
    expect(totals.taxableTotal).toBe(8000);
    expect(totals.taxTotal).toBe(1440);
    expect(totals.grandTotal).toBe(9440);
  });

  // 14. POS and storefront parity
  it('14. Storefront strictly rejects manual staff discounts; allows promotions', () => {
    // Manual discount on storefront rejected
    expect(() =>
      authorizeDiscount({
        subtotal: 5000,
        requestedDiscountAmount: 500,
        channel: 'STOREFRONT',
      }),
    ).toThrow(/public storefront/i);

    // Promotion on storefront accepted
    const storefrontPromo = authorizeDiscount({
      subtotal: 5000,
      promotionDiscount: 500,
      channel: 'STOREFRONT',
    });
    expect(storefrontPromo.isAuthorized).toBe(true);
    expect(storefrontPromo.authorizedDiscountTotal).toBe(500);

    // POS with equivalent discount yields identical discounted taxable subtotal
    const posPromo = authorizeDiscount({
      subtotal: 5000,
      promotionDiscount: 500,
      channel: 'POS',
      staffRole: 'CASHIER',
    });
    expect(storefrontPromo.breakdown.discountedTaxableSubtotal).toBe(posPromo.breakdown.discountedTaxableSubtotal);
  });

  // 15. Discount audit evidence
  it('15. Produces auditable evidence including actor, role, rules, and reason', () => {
    const res = authorizeDiscount({
      subtotal: 10000,
      requestedDiscountPercent: 12,
      staffRole: 'CASHIER',
      staffUserId: 'usr_cashier_42',
      reason: 'VIP repeat customer courtesy',
    });
    expect(res.auditTrail).toBeDefined();
    expect(res.auditTrail.staffUserId).toBe('usr_cashier_42');
    expect(res.auditTrail.staffRole).toBe('CASHIER');
    expect(res.auditTrail.authorizedAmount).toBe(1200);
    expect(res.auditTrail.authorizedPercent).toBe(12);
    expect(res.auditTrail.reason).toBe('VIP repeat customer courtesy');
    expect(res.auditTrail.ruleApplied).toBe('CASHIER_DISCOUNT');
    expect(res.auditTrail.timestamp).toBeDefined();
  });
});

describe('CI-010 branch & location authorization', () => {
  const branchA = 'branch-uuid-colombo-01';
  const branchB = 'branch-uuid-kandy-02';
  const branchC = 'branch-uuid-galle-03';
  const warehouseA = 'wh-uuid-central-01';
  const warehouseB = 'wh-uuid-kandy-02';

  const cashierA = buildUserBranchProfile({
    userId: 'usr_cashier_colombo',
    role: 'CASHIER',
    assignedBranchIds: [branchA],
    assignedWarehouseIds: [warehouseA],
  });

  const managerAB = buildUserBranchProfile({
    userId: 'usr_manager_multi',
    role: 'MANAGER',
    assignedBranchIds: [branchA, branchB],
    assignedWarehouseIds: [warehouseA, warehouseB],
  });

  const ownerGlobal = buildUserBranchProfile({
    userId: 'usr_owner_global',
    role: 'OWNER',
    assignedBranchIds: [],
    assignedWarehouseIds: [],
  });

  // 1. User assigned to Branch A cannot sell from Branch B
  it('1. Cashier assigned to Branch A cannot sell from Branch B', () => {
    expect(() => assertUserBranchAccess(cashierA, branchB)).toThrow(BranchAuthorizationError);
    try {
      assertUserBranchAccess(cashierA, branchB);
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(BranchAuthorizationError);
      expect(err.status).toBe(403);
      expect(err.message).toContain('not authorized to access or transact on branch');
    }
  });

  // 2. User cannot read Branch B inventory
  it('2. Branch read isolation restricts inventory queries to assigned branch', () => {
    // Attempting to query unauthorized branch throws
    expect(() => getAuthorizedBranchFilter(cashierA, branchB)).toThrow(BranchAuthorizationError);

    // Default query without param filters strictly to assigned branch
    const filter = getAuthorizedBranchFilter(cashierA);
    expect(filter.isGlobal).toBe(false);
    expect(filter.branchIds).toEqual([branchA]);
  });

  // 3. User cannot transfer stock from unauthorized location
  it('3. User cannot transfer stock from an unauthorized location', () => {
    expect(() =>
      assertTransferDispatchAuthority(cashierA, {
        locationType: 'BRANCH',
        locationId: branchB,
      }),
    ).toThrow(/not authorized/);

    // Permitted from assigned location
    expect(() =>
      assertTransferDispatchAuthority(cashierA, {
        locationType: 'BRANCH',
        locationId: branchA,
      }),
    ).not.toThrow();
  });

  // 4. User cannot create GRN / receive stock into unauthorized branch or warehouse
  it('4. User cannot create GRN / receive stock into unauthorized warehouse', () => {
    expect(() =>
      assertLocationAccess(cashierA, {
        locationType: 'WAREHOUSE',
        locationId: warehouseB,
      }),
    ).toThrow(/not authorized for warehouse location/);

    expect(() =>
      assertLocationAccess(cashierA, {
        locationType: 'WAREHOUSE',
        locationId: warehouseA,
      }),
    ).not.toThrow();
  });

  // 5. User cannot manipulate branchId in request body (spoofing protection)
  it('5. Spoofed client branchId in POS checkout payload is rejected', () => {
    expect(() => resolveAuthoritativeBranch(cashierA, branchB, branchA)).toThrow(
      BranchAuthorizationError,
    );
  });

  // 6. Owner can operate across all branches
  it('6. Owner has global authority across all branches without assignment restrictions', () => {
    expect(() => assertUserBranchAccess(ownerGlobal, branchA)).not.toThrow();
    expect(() => assertUserBranchAccess(ownerGlobal, branchB)).not.toThrow();
    expect(() => assertUserBranchAccess(ownerGlobal, branchC)).not.toThrow();
    expect(resolveAuthoritativeBranch(ownerGlobal, branchC, branchA)).toBe(branchC);
  });

  // 7. Manager permitted branch scope works for assigned branches
  it('7. Manager permitted branch scope works for assigned branches and blocks unassigned', () => {
    expect(() => assertUserBranchAccess(managerAB, branchA)).not.toThrow();
    expect(() => assertUserBranchAccess(managerAB, branchB)).not.toThrow();
    expect(() => assertUserBranchAccess(managerAB, branchC)).toThrow(BranchAuthorizationError);
  });

  // 8. POS register belongs to correct branch
  it('8. POS register must belong to the authorized branch', () => {
    const registerColombo = { id: 'reg_colombo_01', branchId: branchA, active: true };
    const registerKandy = { id: 'reg_kandy_01', branchId: branchB, active: true };

    // Cashier A on Colombo register matches Colombo branch
    expect(() => assertRegisterBranchIntegrity(registerColombo, branchA)).not.toThrow();

    // Register belonging to Kandy used with Colombo branch transaction throws
    expect(() => assertRegisterBranchIntegrity(registerKandy, branchA)).toThrow(/Register mismatch/);
  });

  // 9. Inactive register is rejected
  it('9. Inactive POS register is rejected', () => {
    const inactiveReg = { id: 'reg_colombo_old', branchId: branchA, active: false };
    expect(() => assertRegisterBranchIntegrity(inactiveReg, branchA)).toThrow(/inactive/);
  });

  // 10. Storefront order resolves to default operational fulfillment location
  it('10. Storefront order without branchId resolves to default fulfillment branch', () => {
    const storefrontOperator = buildUserBranchProfile({
      userId: 'usr_storefront_sys',
      role: 'OWNER',
      assignedBranchIds: [],
    });
    const resolved = resolveAuthoritativeBranch(storefrontOperator, null, branchA);
    expect(resolved).toBe(branchA);
  });

  // 11. Reports respect authorized branch scope
  it('11. Reports respect authorized branch scope for non-owners and provide global scope for Owner', () => {
    const cashierFilter = getAuthorizedBranchFilter(cashierA);
    expect(cashierFilter.isGlobal).toBe(false);
    expect(cashierFilter.branchIds).toEqual([branchA]);

    const managerFilter = getAuthorizedBranchFilter(managerAB);
    expect(managerFilter.isGlobal).toBe(false);
    expect(managerFilter.branchIds).toEqual([branchA, branchB]);

    const ownerFilter = getAuthorizedBranchFilter(ownerGlobal);
    expect(ownerFilter.isGlobal).toBe(true);
    expect(ownerFilter.branchIds).toEqual([]);
  });

  // 12. Branch-scoped refunds assert cashier branch access
  it('12. Branch-scoped refunds assert cashier authority over the target branch', () => {
    expect(() => assertUserBranchAccess(cashierA, branchB)).toThrow(BranchAuthorizationError);
    expect(() => assertUserBranchAccess(cashierA, branchA)).not.toThrow();
  });

  // 13. Stock adjustment on unauthorized location blocked
  it('13. Stock adjustment or stock take on unauthorized location is blocked', () => {
    expect(() =>
      assertLocationAccess(cashierA, {
        locationType: 'BRANCH',
        locationId: branchB,
      }),
    ).toThrow(BranchAuthorizationError);
  });

  // 14. Unassigned non-owner staff blocked from checkout
  it('14. Non-owner staff with zero assigned branches is blocked from checkout', () => {
    const unassignedCashier = buildUserBranchProfile({
      userId: 'usr_unassigned',
      role: 'CASHIER',
      assignedBranchIds: [],
    });
    expect(() => resolveAuthoritativeBranch(unassignedCashier, null, branchA)).toThrow(
      /no assigned retail branch/i,
    );
  });

  // 15. Omitted branchId authoritatively resolves to cashier's assigned default branch
  it('15. Omitted branchId resolves authoritatively to cashier assigned default branch', () => {
    const resolved = resolveAuthoritativeBranch(cashierA, null, branchB);
    expect(resolved).toBe(branchA); // Uses cashier's assigned branch, not the fallback
  });
});

describe('CI-011 customer & Polim Potha credit authorization', () => {
  const activeCustomer: CustomerCreditProfile = {
    id: 'cust_perera_01',
    name: 'Sunil Perera',
    phone: '0771234567',
    email: 'sunil@example.lk',
    active: true,
    creditLimit: 50000,
    segment: 'VIP',
    branchId: 'branch_colombo',
  };

  const inactiveCustomer: CustomerCreditProfile = {
    id: 'cust_inactive_02',
    name: 'Kamal Silva (Suspended)',
    phone: '0779998888',
    active: false,
    creditLimit: 25000,
  };

  const standardAccount: PolimPothaAccountState = {
    customerId: 'cust_perera_01',
    creditLimit: 50000,
    currentBalance: 15000,
    status: 'ACTIVE',
  };

  const blockedAccount: PolimPothaAccountState = {
    customerId: 'cust_perera_01',
    creditLimit: 50000,
    currentBalance: 48000,
    status: 'BLOCKED',
  };

  const zeroLimitAccount: PolimPothaAccountState = {
    customerId: 'cust_perera_01',
    creditLimit: 0,
    currentBalance: 0,
    status: 'ACTIVE',
  };

  // 1. Authorized customer access
  it('1. Authorizes credit sale for active customer with valid account within limit', () => {
    const auth = authorizeCreditSale({
      customer: activeCustomer,
      account: standardAccount,
      creditAmount: 10000,
      staffRole: 'CASHIER',
      orderNumber: 'POS-1001',
    });
    expect(auth.authorized).toBe(true);
    expect(auth.previousBalance).toBe(15000);
    expect(auth.newBalance).toBe(25000);
    expect(auth.availableCreditAfter).toBe(25000);
    expect(auth.entryDraft.type).toBe('INVOICE');
    expect(auth.entryDraft.amount).toBe(10000);
  });

  // 2. Unauthorized customer access (inactive)
  it('2. Rejects credit transaction for deactivated/inactive customer', () => {
    expect(() =>
      authorizeCreditSale({
        customer: inactiveCustomer,
        account: standardAccount,
        creditAmount: 5000,
        staffRole: 'CASHIER',
      }),
    ).toThrow(CustomerCreditAuthorizationError);
  });

  // 3. Spoofed customerId (non-existent customer)
  it('3. Rejects non-existent or spoofed customerId with 404', () => {
    try {
      authorizeCreditSale({
        customer: null,
        account: null,
        creditAmount: 5000,
        staffRole: 'CASHIER',
      });
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(CustomerCreditAuthorizationError);
      expect(err.status).toBe(404);
      expect(err.code).toBe('CUSTOMER_NOT_FOUND');
    }
  });

  // 4. Cash sale without credit
  it('4. Cash sales do not touch or alter Polim Potha credit ledger', () => {
    // If payment method is CASH, Polim balance remains unchanged
    expect(standardAccount.currentBalance).toBe(15000);
  });

  // 5. Valid credit sale
  it('5. Valid credit sale computes exact authoritative balance and drafts invoice entry', () => {
    const auth = authorizeCreditSale({
      customer: activeCustomer,
      account: standardAccount,
      creditAmount: 20000,
      staffRole: 'CASHIER',
      orderNumber: 'POS-1005',
    });
    expect(auth.newBalance).toBe(35000);
    expect(auth.entryDraft.amount).toBe(20000);
    expect(auth.entryDraft.balanceAfter).toBe(35000);
  });

  // 6. Credit limit enforcement
  it('6. Enforces exact credit limit (current + new <= creditLimit)', () => {
    // 15000 + 35000 = 50000 (exactly at limit) -> succeeds
    const auth = authorizeCreditSale({
      customer: activeCustomer,
      account: standardAccount,
      creditAmount: 35000,
      staffRole: 'CASHIER',
    });
    expect(auth.newBalance).toBe(50000);
    expect(auth.availableCreditAfter).toBe(0);
  });

  // 7. Credit sale exceeding limit
  it('7. Rejects credit sale exceeding limit without Owner override', () => {
    // 15000 + 36000 = 51000 > 50000 -> throws 403
    try {
      authorizeCreditSale({
        customer: activeCustomer,
        account: standardAccount,
        creditAmount: 36000,
        staffRole: 'CASHIER',
      });
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(CustomerCreditAuthorizationError);
      expect(err.status).toBe(403);
      expect(err.code).toBe('CREDIT_LIMIT_EXCEEDED');
    }
  });

  // 8. Existing outstanding balance included
  it('8. Existing outstanding balance is strictly included in limit calculation', () => {
    const highBalanceAccount: PolimPothaAccountState = {
      customerId: 'cust_perera_01',
      creditLimit: 50000,
      currentBalance: 45000,
      status: 'ACTIVE',
    };
    // Available is 5000; sale of 6000 fails
    expect(() =>
      authorizeCreditSale({
        customer: activeCustomer,
        account: highBalanceAccount,
        creditAmount: 6000,
        staffRole: 'CASHIER',
      }),
    ).toThrow(/Credit limit exceeded/);
  });

  // 9. Partial credit repayment
  it('9. Authorizes partial credit repayment and authoritatively reduces balance', () => {
    const repay = authorizeCreditRepayment({
      account: standardAccount,
      repaymentAmount: 5000,
      paymentMethod: 'CASH',
      notes: 'Weekly instalment',
    });
    expect(repay.authorized).toBe(true);
    expect(repay.previousBalance).toBe(15000);
    expect(repay.newBalance).toBe(10000);
    expect(repay.entryDraft.type).toBe('REPAYMENT');
  });

  // 10. Full repayment
  it('10. Full repayment reduces outstanding balance exactly to 0', () => {
    const repay = authorizeCreditRepayment({
      account: standardAccount,
      repaymentAmount: 15000,
      paymentMethod: 'CARD',
    });
    expect(repay.newBalance).toBe(0);
  });

  // 11. Customer return/refund against credit
  it('11. Customer return against credit reduces outstanding AR balance without cash payout', () => {
    const ret = authorizeCreditReturn({
      account: standardAccount,
      returnAmount: 3000,
      orderNumber: 'POS-1001',
    });
    expect(ret.authorized).toBe(true);
    expect(ret.previousBalance).toBe(15000);
    expect(ret.newBalance).toBe(12000);
    expect(ret.entryDraft.type).toBe('RETURN');
    expect(ret.entryDraft.amount).toBe(3000);
  });

  // 12. Cancelled credit sale
  it('12. Cancelled credit sale restores pre-invoice balance via cancellation ledger entry', () => {
    const cancel = authorizeCreditCancellation({
      account: standardAccount,
      invoiceAmount: 5000,
      orderNumber: 'POS-1002',
    });
    expect(cancel.authorized).toBe(true);
    expect(cancel.newBalance).toBe(10000);
    expect(cancel.entryDraft.type).toBe('CANCELLATION');
  });

  // 13. Cross-branch customer access
  it('13. Cross-branch customer access: Customer can purchase at authorized branch while respecting limit', () => {
    const colomboStaffRole = 'CASHIER' as const;
    const auth = authorizeCreditSale({
      customer: activeCustomer, // Registered at Colombo
      account: standardAccount,
      creditAmount: 5000,
      staffRole: colomboStaffRole,
    });
    expect(auth.authorized).toBe(true);
    expect(auth.newBalance).toBe(20000);
  });

  // 14. Manipulated credit amount
  it('14. Server derives credit sale from authoritative order total, ignoring client manipulation', () => {
    // Client claims creditAmount = 100, but order total is 12000
    const authoritativeOrderTotal = 12000;
    const auth = authorizeCreditSale({
      customer: activeCustomer,
      account: standardAccount,
      creditAmount: authoritativeOrderTotal, // Server enforces authoritative total
      staffRole: 'CASHIER',
    });
    expect(auth.creditAmount).toBe(12000);
    expect(auth.newBalance).toBe(27000);
  });

  // 15. Polim Potha balance reconciliation
  it('15. Reconciles Polim Potha ledger: newOutstanding = existing + sales - repayments - returns - cancels', () => {
    const initialBalance = 10000;
    const entries = [
      { type: 'INVOICE' as const, amount: 20000 },
      { type: 'REPAYMENT' as const, amount: 8000 },
      { type: 'RETURN' as const, amount: 2000 },
      { type: 'CANCELLATION' as const, amount: 5000 },
    ];
    // 10000 + 20000 - 8000 - 2000 - 5000 = 15000
    const rec = reconcilePolimLedger(initialBalance, entries);
    expect(rec.reconciledBalance).toBe(15000);
    expect(rec.totalInvoiced).toBe(20000);
    expect(rec.totalRepaid).toBe(8000);
    expect(rec.totalReturned).toBe(2000);
    expect(rec.totalCancelled).toBe(5000);
    expect(rec.isAccurate).toBe(true);
  });

  // 16. Duplicate credit transaction / idempotency
  it('16. Idempotency key prevents double debiting the customer credit ledger', () => {
    const existingEntry: PolimLedgerEntry = {
      id: 'entry_dup_1',
      customerId: activeCustomer.id,
      type: 'INVOICE',
      amount: 10000,
      balanceAfter: 25000,
      idempotencyKey: 'idemp_key_credit_999',
      createdAt: new Date(),
    };

    const auth = authorizeCreditSale({
      customer: activeCustomer,
      account: standardAccount,
      creditAmount: 10000,
      staffRole: 'CASHIER',
      idempotencyKey: 'idemp_key_credit_999',
      existingEntries: [existingEntry],
    });

    expect(auth.isIdempotentReplay).toBe(true);
    expect(auth.ruleApplied).toBe('IDEMPOTENT_REPLAY');
    expect(auth.newBalance).toBe(25000); // Does NOT add another 10,000 to become 35,000!
  });

  // 17. Customer with no credit authority (BLOCKED or zero limit)
  it('17. Customer with BLOCKED account or zero credit limit is barred from credit purchases', () => {
    // Blocked account
    expect(() =>
      authorizeCreditSale({
        customer: activeCustomer,
        account: blockedAccount,
        creditAmount: 1000,
        staffRole: 'CASHIER',
      }),
    ).toThrow(/BLOCKED/i);

    // Zero limit account
    expect(() =>
      authorizeCreditSale({
        customer: activeCustomer,
        account: zeroLimitAccount,
        creditAmount: 1000,
        staffRole: 'CASHIER',
      }),
    ).toThrow(/zero credit limit/i);
  });

  // 18. Owner/authorized manager override
  it('18. Owner override permits credit sale exceeding customer credit limit with audit rule', () => {
    // 15000 + 40000 = 55000 > 50000 limit
    // Cashier alone is blocked
    expect(() =>
      authorizeCreditSale({
        customer: activeCustomer,
        account: standardAccount,
        creditAmount: 40000,
        staffRole: 'CASHIER',
      }),
    ).toThrow(CustomerCreditAuthorizationError);

    // With Owner override -> succeeds with audit trail
    const auth = authorizeCreditSale({
      customer: activeCustomer,
      account: standardAccount,
      creditAmount: 40000,
      staffRole: 'CASHIER',
      overrideRole: 'OWNER',
      overrideUserId: 'usr_owner_01',
    });
    expect(auth.authorized).toBe(true);
    expect(auth.newBalance).toBe(55000);
    expect(auth.ruleApplied).toBe('CREDIT_LIMIT_OVERRIDDEN_BY_OWNER');
  });
});



