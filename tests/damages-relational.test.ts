import { describe, it, expect, vi } from 'vitest';
import { GET, POST, PATCH } from '@/app/api/damages/route';

vi.mock('@/db', () => {
  const fakeDamages = [
    {
      id: 'dmg-uuid-1',
      damageNumber: 'DMG-001',
      productName: 'Anchor Milk Powder 400g',
      quantity: 2,
      unitCost: '950.00',
      totalLoss: '1900.00',
      status: 'PENDING',
      createdAt: new Date(),
    },
  ];

  return {
    db: {
      select: () => ({
        from: (table: any) => ({
          orderBy: () => ({
            limit: () => Promise.resolve(fakeDamages),
          }),
          limit: () => Promise.resolve([{ id: '00000000-0000-0000-0000-000000000001' }]),
          where: () => ({
            limit: () => Promise.resolve(fakeDamages),
          }),
        }),
      }),
      insert: () => ({
        values: (val: any) => ({
          returning: () => Promise.resolve([{ id: 'dmg-uuid-2', ...val }]),
        }),
      }),
      update: () => ({
        set: (val: any) => ({
          where: () => ({
            returning: () => Promise.resolve([{ id: 'dmg-uuid-1', ...val }]),
          }),
        }),
      }),
      delete: () => ({
        where: () => Promise.resolve(),
      }),
      transaction: async (cb: any) => cb({}),
    },
    damages: { _name: 'damages' },
    branches: { _name: 'branches' },
    products: { _name: 'products' },
    hasDatabaseUrl: () => true,
  };
});

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn().mockResolvedValue({ userId: 'dev', role: 'OWNER', name: 'Store Owner' }),
  assertCanMutateCommerce: vi.fn(),
  isDemoUserId: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/damages/damage-write-off', () => ({
  postDamageWriteOff: vi.fn().mockResolvedValue('je-uuid-123'),
}));

vi.mock('@/lib/inventory/stock-service', () => ({
  recordDamage: vi.fn().mockResolvedValue(undefined),
}));

describe('Damages Relational Database Route (Odoo-Class)', () => {
  it('GET /api/damages returns real relational damages records', async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.damages).toHaveLength(1);
    expect(data.damages[0].productName).toBe('Anchor Milk Powder 400g');
  });

  it('POST /api/damages inserts new damage record into relational table', async () => {
    const req = new Request('http://localhost/api/damages', {
      method: 'POST',
      body: JSON.stringify({
        productName: 'Highland Yogurt Cup',
        quantity: 5,
        unitCost: 80,
        reason: 'EXPIRED',
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.damage.productName).toBe('Highland Yogurt Cup');
    expect(data.damage.totalLoss).toBe('400.00');
  });

  it('PATCH /api/damages approve action executes GL write-off and updates status to APPROVED', async () => {
    const req = new Request('http://localhost/api/damages', {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'approve',
        id: 'dmg-uuid-1',
      }),
    });

    const res = await PATCH(req);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.damage.status).toBe('APPROVED');
    expect(data.journalEntryId).toBe('je-uuid-123');
  });
});
