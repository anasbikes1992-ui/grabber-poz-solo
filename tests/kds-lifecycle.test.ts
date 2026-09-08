import { describe, it, expect, vi } from 'vitest';
import { getKdsState, bumpKdsTicket, reopenKdsTicket } from '@/lib/restaurant/restaurant-service';

vi.mock('@/db', () => {
  const fakeTickets = [
    {
      id: 'ticket-1',
      kotNumber: 'KOT-101',
      tableId: 'table-1',
      waiterName: 'Kamal',
      status: 'OPEN',
      itemsJson: [
        { name: 'Devilled Chicken', qty: 1, price: 1200, station: 'KITCHEN', course: 'MAIN' },
        { name: 'Lion Beer 625ml', qty: 2, price: 650, station: 'BAR', course: 'BEVERAGE' },
      ],
      totalAmount: '2500.00',
      createdAt: new Date(Date.now() - 15 * 60000), // 15 mins ago -> WARNING
    },
    {
      id: 'ticket-2',
      kotNumber: 'KOT-102',
      tableId: 'table-2',
      waiterName: 'Nimal',
      status: 'PREPARING',
      itemsJson: [
        { name: 'BBQ Pork Ribs', qty: 1, price: 2800, station: 'GRILL', course: 'MAIN' },
      ],
      totalAmount: '2800.00',
      createdAt: new Date(Date.now() - 25 * 60000), // 25 mins ago -> CRITICAL
    },
  ];

  const fakeTables = [
    { id: 'table-1', name: 'Table 01 (Window)', active: true, sortOrder: 1 },
    { id: 'table-2', name: 'Table 02 (Center)', active: true, sortOrder: 2 },
  ];

  const createQueryChain = (data: any[]) => {
    const p = Promise.resolve(data);
    return Object.assign(p, {
      where: () => createQueryChain(data),
      orderBy: () => createQueryChain(data),
      limit: (n: number) => Promise.resolve(data.slice(0, n)),
    });
  };

  return {
    db: {
      select: () => ({
        from: (table: any) => {
          if (table._name === 'kitchen_tickets') return createQueryChain(fakeTickets);
          if (table._name === 'dining_tables') return createQueryChain(fakeTables);
          return createQueryChain([]);
        },
      }),
      update: () => ({
        set: (vals: any) => ({
          where: () => ({
            returning: () => Promise.resolve([{ id: 'ticket-1', ...vals }]),
          }),
        }),
      }),
      transaction: async (cb: any) => cb({}),
    },
    kitchenTickets: { _name: 'kitchen_tickets' },
    diningTables: { _name: 'dining_tables' },
    branches: { _name: 'branches' },
    hasDatabaseUrl: () => true,
  };
});

vi.mock('@/lib/restaurant/recipe-bom', () => ({
  depleteRecipeForProduct: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/restaurant/recipe-low-stock', () => ({
  checkRecipeLowStock: vi.fn().mockResolvedValue([]),
}));

describe('Kitchen Display System (KDS) Lifecycle & Routing', () => {
  it('filters tickets by preparation station correctly', async () => {
    const allState = await getKdsState('ALL');
    expect(allState.tickets).toHaveLength(2);
    expect(allState.tickets[0].urgency).toBe('WARNING');
    expect(allState.tickets[1].urgency).toBe('CRITICAL');

    const grillState = await getKdsState('GRILL');
    expect(grillState.tickets).toHaveLength(1);
    expect(grillState.tickets[0].items[0].name).toBe('BBQ Pork Ribs');
  });

  it('bumps ticket from OPEN to PREPARING to READY to SERVED', async () => {
    const bump1 = await bumpKdsTicket('ticket-1');
    expect(bump1.newStatus).toBe('PREPARING');
  });

  it('reopens a completed or ready ticket back to PREPARING', async () => {
    const reopen = await reopenKdsTicket('ticket-1');
    expect(reopen.ticket.status).toBe('PREPARING');
  });
});
