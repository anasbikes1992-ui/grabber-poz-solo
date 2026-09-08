import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '@/app/api/warranties/route';

vi.mock('@/db', () => {
  const fakeSerials = [
    {
      id: 'sn-uuid-1',
      serial: 'IMEI-9847291847192',
      productId: 'prod-uuid-1',
      productName: 'Samsung Galaxy A15',
      customerName: 'Roshan Silva',
      customerPhone: '0771234567',
      status: 'SOLD',
      warrantyExpires: new Date(Date.now() + 365 * 86400000),
      notes: '1-Year Company Warranty',
      createdAt: new Date(),
    },
  ];

  return {
    db: {
      select: () => ({
        from: (table: any) => ({
          orderBy: () => ({
            limit: () => Promise.resolve(fakeSerials),
          }),
          where: () => ({
            limit: () => Promise.resolve([]),
            orderBy: () => ({
              limit: () => Promise.resolve(fakeSerials),
            }),
          }),
          limit: () => Promise.resolve([{ id: 'prod-uuid-1' }]),
        }),
      }),
      insert: () => ({
        values: (val: any) => ({
          returning: () => Promise.resolve([{ id: 'sn-uuid-2', ...val }]),
        }),
      }),
      update: () => ({
        set: (val: any) => ({
          where: () => ({
            returning: () => Promise.resolve([{ id: 'sn-uuid-1', ...val }]),
          }),
        }),
      }),
      transaction: async (cb: any) => cb({}),
    },
    serialNumbers: { _name: 'serial_numbers' },
    products: { _name: 'products' },
    hasDatabaseUrl: () => true,
  };
});

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn().mockResolvedValue({ userId: 'dev', role: 'OWNER', name: 'Store Owner' }),
  assertCanMutateCommerce: vi.fn(),
  isDemoUserId: vi.fn().mockReturnValue(false),
}));

describe('Warranties & Serial Numbers Relational Route (Odoo-Class)', () => {
  it('GET /api/warranties queries serial_numbers table', async () => {
    const req = new Request('http://localhost/api/warranties');
    const res = await GET(req);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.warranties).toHaveLength(1);
    expect(data.warranties[0].serial).toBe('IMEI-9847291847192');
    expect(data.warranties[0].customerName).toBe('Roshan Silva');
  });

  it('POST /api/warranties registers a new warranty in the serial_numbers table', async () => {
    const req = new Request('http://localhost/api/warranties', {
      method: 'POST',
      body: JSON.stringify({
        serial: 'SN-IPHONE15-0982',
        productName: 'iPhone 15 128GB',
        customerName: 'Anura Bandara',
        customerPhone: '0719876543',
        notes: 'Official Apple care 12m',
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.warranty.serial).toBe('SN-IPHONE15-0982');
    expect(data.warranty.customerName).toBe('Anura Bandara');
  });
});
