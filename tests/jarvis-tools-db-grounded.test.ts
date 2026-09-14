import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression guard for the P0 fix: get_stock_summary and get_customer_credit_report
 * must read from Postgres (stockBalances / polimPothaAccounts / polimPothaEntries),
 * not from the disconnected in-memory InventoryEngine/CreditEngine singletons.
 */
function mockDbWith(tables: {
  stockBalances?: any[];
  polimPothaAccounts?: any[];
  polimPothaEntries?: any[];
}) {
  const createQueryChain = (data: any[]) => {
    const p = Promise.resolve(data);
    return Object.assign(p, {
      where: () => createQueryChain(data),
      orderBy: () => createQueryChain(data),
      limit: (n: number) => Promise.resolve(data.slice(0, n)),
    });
  };

  vi.doMock('@/db', () => ({
    db: {
      select: () => ({
        from: (table: any) => {
          if (table._name === 'stock_balances') return createQueryChain(tables.stockBalances || []);
          if (table._name === 'polim_potha_accounts') return createQueryChain(tables.polimPothaAccounts || []);
          if (table._name === 'polim_potha_entries') return createQueryChain(tables.polimPothaEntries || []);
          return createQueryChain([]);
        },
      }),
    },
    stockBalances: { _name: 'stock_balances' },
    polimPothaAccounts: { _name: 'polim_potha_accounts' },
    polimPothaEntries: { _name: 'polim_potha_entries' },
    auditLogs: { _name: 'audit_logs' },
    hasDatabaseUrl: () => true,
  }));
  vi.doMock('@/lib/ai/jarvis-db-tools', () => ({ JARVIS_DB_TOOLS: [] }));
}

const ownerContext = {
  userId: 'u1',
  userName: 'Owner',
  role: 'OWNER' as const,
  assignedBranchIds: ['branch-1'],
  assignedWarehouseIds: [],
};

beforeEach(() => {
  vi.resetModules();
});
describe('Jarvis core tools are DB-grounded (not the disconnected in-memory engines)', () => {
  it('get_stock_summary aggregates real stockBalances rows for a location', async () => {
    mockDbWith({
      stockBalances: [
        { locationId: 'branch-1', productId: 'prod-1', variantId: null, onHand: 30, reserved: 5 },
        { locationId: 'branch-1', productId: 'prod-2', variantId: null, onHand: 12, reserved: 2 },
      ],
    });
    const { JarvisToolRegistry } = await import('@/lib/ai/jarvis-tools');
    const registry = new JarvisToolRegistry();
    const result = await registry.invokeTool('get_stock_summary', { locationId: 'branch-1' }, ownerContext);

    expect(result.status).toBe('EXECUTED');
    expect(result.data).toMatchObject({
      skuCount: 2,
      totalOnHand: 42,
      totalReserved: 7,
      totalAvailable: 35,
    });
  });

  it('get_stock_summary filters to a single product when productId is given', async () => {
    mockDbWith({
      stockBalances: [{ locationId: 'branch-1', productId: 'prod-1', variantId: null, onHand: 30, reserved: 5 }],
    });
    const { JarvisToolRegistry } = await import('@/lib/ai/jarvis-tools');
    const registry = new JarvisToolRegistry();
    const result = await registry.invokeTool(
      'get_stock_summary',
      { locationId: 'branch-1', productId: 'prod-1' },
      ownerContext,
    );

    expect(result.data).toMatchObject({ productId: 'prod-1', onHand: 30, reserved: 5, available: 25 });
  });

  it('get_customer_credit_report reads the real Polim Potha account + ledger, not an empty in-memory map', async () => {
    mockDbWith({
      polimPothaAccounts: [
        { customerId: 'cust-1', creditLimit: '50000.00', currentBalance: '18000.00', status: 'ACTIVE' },
      ],
      polimPothaEntries: [
        { type: 'INVOICE', amount: '18000.00', createdAt: new Date(Date.now() - 10 * 86400000) },
      ],
    });
    const { JarvisToolRegistry } = await import('@/lib/ai/jarvis-tools');
    const registry = new JarvisToolRegistry();
    const result = await registry.invokeTool('get_customer_credit_report', { customerId: 'cust-1' }, ownerContext);

    expect(result.status).toBe('EXECUTED');
    const data = result.data as { account: { balance: number; creditLimit: number }; aging: Record<string, number> };
    expect(data.account.balance).toBe(18000);
    expect(data.account.creditLimit).toBe(50000);
    expect(data.aging.days0to30).toBeGreaterThan(0);
  });

  it('get_customer_credit_report returns null account for a customer with no Polim Potha account (not a stale empty in-memory record)', async () => {
    mockDbWith({});
    const { JarvisToolRegistry } = await import('@/lib/ai/jarvis-tools');
    const registry = new JarvisToolRegistry();
    const result = await registry.invokeTool('get_customer_credit_report', { customerId: 'unknown' }, ownerContext);

    expect(result.data).toEqual({ account: null, aging: null });
  });
});

