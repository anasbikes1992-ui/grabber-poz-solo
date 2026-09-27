import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processOrderReturn, refundPayoutAccountCode } from '@/lib/returns/returns-service';
import { recordDamage } from '@/lib/inventory/stock-service';

const { orderReturnsDb, orderReturnLinesDb, journalEntriesDb, journalLinesDb, orderState, paymentsDb } = vi.hoisted(() => ({
  orderReturnsDb: [] as any[],
  orderReturnLinesDb: [] as any[],
  journalEntriesDb: [] as any[],
  journalLinesDb: [] as any[],
  orderState: { paymentStatus: 'PAID', item1TaxAmount: '0.00' },
  paymentsDb: [{ id: 'pay-1', method: 'CASH', amount: '1500.00', status: 'CAPTURED' }] as any[],
}));

vi.mock('@/db', () => {
  const fakeOrderId = '00000000-0000-0000-0000-000000000010';
  const fakeItemId1 = '00000000-0000-0000-0000-000000000020';
  const fakeItemId2 = '00000000-0000-0000-0000-000000000021';
  const fakeProdId1 = '00000000-0000-0000-0000-000000000030';
  const fakeProdId2 = '00000000-0000-0000-0000-000000000031';
  const fakeBranchId = '00000000-0000-0000-0000-000000000001';

  const resolveData = (table: any) => {
    if (table._name === 'orders') {
      return [
        {
          id: fakeOrderId,
          orderNumber: 'ORD-TEST-001',
          branchId: fakeBranchId,
          customerId: '00000000-0000-0000-0000-000000000099',
          grandTotal: '1500.00',
          orderStatus: 'CONFIRMED',
          paymentStatus: orderState.paymentStatus,
        },
      ];
    }
    if (table._name === 'order_items') {
      return [
        {
          id: fakeItemId1,
          orderId: fakeOrderId,
          productId: fakeProdId1,
          variantId: null,
          nameSnapshot: 'Organic Coconut Milk',
          quantity: 4,
          unitPrice: '250.00',
          discountAmount: '0.00',
          taxAmount: orderState.item1TaxAmount,
          unitCost: '180.00',
        },
        {
          id: fakeItemId2,
          orderId: fakeOrderId,
          productId: fakeProdId2,
          variantId: null,
          nameSnapshot: 'Ceylon Tea 500g',
          quantity: 1,
          unitPrice: '500.00',
          discountAmount: '0.00',
          taxAmount: '0.00',
          unitCost: '350.00',
        },
      ];
    }
    if (table._name === 'order_returns') {
      return orderReturnsDb;
    }
    if (table._name === 'order_return_lines') {
      return orderReturnLinesDb;
    }
    if (table._name === 'payments') {
      return paymentsDb;
    }
    if (table._name === 'chart_of_accounts') {
      return [{ id: 'coa-mock-id' }];
    }
    if (table._name === 'polim_potha_accounts') {
      return [
        {
          id: 'pp-mock-id',
          customerId: '00000000-0000-0000-0000-000000000099',
          currentBalance: '5000.00',
        },
      ];
    }
    return [];
  };

  const createQueryChain = (table: any) => {
    const data = resolveData(table);
    const promise = Promise.resolve(data);
    return Object.assign(promise, {
      where: () => createQueryChain(table),
      limit: (n: number) => Promise.resolve(data.slice(0, n)),
      orderBy: () => createQueryChain(table),
    });
  };

  const mockTx = {
    select: () => ({
      from: (table: any) => createQueryChain(table),
    }),
    insert: (table: any) => ({
      values: (val: any) => {
        if (table._name === 'journal_lines') {
          const rows = Array.isArray(val) ? val : [val];
          journalLinesDb.push(...rows);
        }

        return {
          returning: () => {
          if (table._name === 'order_returns') {
            const row = { id: `ret-${Date.now()}`, ...val };
            orderReturnsDb.push(row);
            return Promise.resolve([row]);
          }
          if (table._name === 'order_return_lines') {
            const rows = Array.isArray(val) ? val.map((v) => ({ id: `rtl-${Math.random()}`, ...v })) : [{ id: 'rtl-1', ...val }];
            orderReturnLinesDb.push(...rows);
            return Promise.resolve(rows);
          }
          if (table._name === 'journal_entries') {
            const row = { id: `je-${Date.now()}`, ...val };
            journalEntriesDb.push(row);
            return Promise.resolve([row]);
          }
          return Promise.resolve([{ id: 'mock-id', ...val }]);
        },
        then: (cb: any) => cb(),
        };
      },
    }),
    update: (table: any) => ({
      set: (val: any) => ({
        where: () => Promise.resolve([{ ...val }]),
      }),
    }),
  };

  return {
    db: {
      transaction: async (cb: any) => cb(mockTx),
      select: () => mockTx.select(),
    },
    orders: { _name: 'orders' },
    orderItems: { _name: 'order_items' },
    orderReturns: { _name: 'order_returns' },
    orderReturnLines: { _name: 'order_return_lines' },
    payments: { _name: 'payments' },
    journalEntries: { _name: 'journal_entries' },
    journalLines: { _name: 'journal_lines' },
    chartOfAccounts: { _name: 'chart_of_accounts' },
    polimPothaAccounts: { _name: 'polim_potha_accounts' },
    polimPothaEntries: { _name: 'polim_potha_entries' },
    auditLogs: { _name: 'audit_logs' },
    hasDatabaseUrl: () => true,
  };
});

vi.mock('@/lib/commerce/ensure-coa', () => ({
  ensureDefaultChartOfAccounts: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/inventory/stock-service', () => ({
  recordReturn: vi.fn().mockResolvedValue(undefined),
  recordDamage: vi.fn().mockResolvedValue(undefined),
}));

describe('Returns & Refunds Domain Engine (Odoo-Class)', () => {
  const testOrderId = '00000000-0000-0000-0000-000000000010';
  const testItemId1 = '00000000-0000-0000-0000-000000000020';

  beforeEach(() => {
    orderReturnsDb.length = 0;
    orderReturnLinesDb.length = 0;
    journalEntriesDb.length = 0;
    journalLinesDb.length = 0;
    orderState.paymentStatus = 'PAID';
    orderState.item1TaxAmount = '0.00';
    paymentsDb.length = 0;
    paymentsDb.push({ id: 'pay-1', method: 'CASH', amount: '1500.00', status: 'CAPTURED' });
    vi.mocked(recordDamage).mockClear();
  });

  it('processes partial return of 2 units out of 4 with balanced refund and restock', async () => {
    const result = await processOrderReturn({
      orderId: testOrderId,
      reason: 'Wrong variant selected',
      refundDestination: 'CASH',
      lines: [
        {
          orderItemId: testItemId1,
          quantity: 2,
          gradingStatus: 'RESTOCKED',
        },
      ],
      actorId: 'user-manager-1',
    });

    expect(result.summary.returnNumber).toMatch(/^RET-/);
    expect(result.summary.refundAmount).toBe(500); // 2 * 250
    expect(result.summary.itemsCount).toBe(1);
    expect(result.summary.isFullyReturned).toBe(false);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].quantity).toBe(2);
    expect(result.lines[0].gradingStatus).toBe('RESTOCKED');
  });

  it('rejects attempt to return more than purchased quantity', async () => {
    await expect(
      processOrderReturn({
        orderId: testOrderId,
        lines: [
          {
            orderItemId: testItemId1,
            quantity: 10, // Max available is 4
          },
        ],
      }),
    ).rejects.toThrow(/Maximum returnable quantity is 4/);
  });

  it('rejects client-supplied refund amount overrides', async () => {
    await expect(
      processOrderReturn({
        orderId: testOrderId,
        refundAmount: 1500,
        lines: [
          {
            orderItemId: testItemId1,
            quantity: 1,
          },
        ],
      }),
    ).rejects.toThrow(/cannot be overridden/);
  });

  it('rejects refund attempts when no captured payment exists', async () => {
    orderState.paymentStatus = 'PENDING';
    paymentsDb.length = 0;
    paymentsDb.push({ id: 'pay-cod', method: 'COD', amount: '250.00', status: 'PENDING' });

    await expect(
      processOrderReturn({
        orderId: testOrderId,
        lines: [
          {
            orderItemId: testItemId1,
            quantity: 1,
          },
        ],
      }),
    ).rejects.toThrow(/has been captured/);
  });

  it('handles damaged grading by tagging line as DAMAGED for write-off', async () => {
    const result = await processOrderReturn({
      orderId: testOrderId,
      lines: [
        {
          orderItemId: testItemId1,
          quantity: 1,
          gradingStatus: 'DAMAGED',
          reason: 'Broken seal on delivery',
        },
      ],
    });

    expect(result.lines[0].gradingStatus).toBe('DAMAGED');
    expect(result.summary.refundAmount).toBe(250);
    expect(recordDamage).not.toHaveBeenCalled();
  });

  it('posts VAT reversal separately from revenue when returned item includes tax', async () => {
    orderState.item1TaxAmount = '72.00';

    await processOrderReturn({
      orderId: testOrderId,
      lines: [
        {
          orderItemId: testItemId1,
          quantity: 1,
        },
      ],
    });

    expect(journalLinesDb.some((line) => line.memo === 'VAT payable reversed for returned goods' && line.debit === '18.00')).toBe(true);
  });

  it('maps card and bank refunds away from cash', () => {
    expect(refundPayoutAccountCode('CASH')).toBe('1010');
    expect(refundPayoutAccountCode('CARD')).toBe('1020');
    expect(refundPayoutAccountCode('BANK_TRANSFER')).toBe('1020');
    expect(refundPayoutAccountCode('ORIGINAL')).toBe('1020');
  });
});
