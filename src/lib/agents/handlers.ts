import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import {
  db,
  orders,
  stockBalances,
  products,
  repairJobs,
  diningTables,
  kitchenTickets,
  hirePurchaseContracts,
  appointments,
  loyaltyMembers,
  polimPothaAccounts,
  customers,
  creativeProjects,
} from '@/db';
import { readConfigJson } from '@/lib/config/business-settings';
import { listCollection } from '@/lib/db/app-collections';
import { listAutomationLogs } from '@/lib/automation/rules-store';
import type { AgentId, AgentResult } from './types';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function runSalesAgent(): Promise<AgentResult> {
  const todayStart = startOfToday();
  const [salesToday] = await db
    .select({
      total: sql<string>`coalesce(sum(${orders.grandTotal}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(sql`${orders.createdAt} >= ${todayStart} AND ${orders.orderStatus} != 'DRAFT'`);

  const pendingCod = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.channel, 'STOREFRONT'),
        eq(orders.paymentStatus, 'PENDING'),
        sql`${orders.orderStatus} NOT IN ('CANCELLED', 'DRAFT')`,
      ),
    );

  const codCount = pendingCod[0]?.count || 0;
  const recs = [
    codCount > 0
      ? `Follow up on ${codCount} pending storefront COD order(s) within 2 hours.`
      : 'No pending COD orders — promote hero SKUs on homepage.',
    'Review top-margin products for cross-sell at POS.',
  ];

  return {
    agent: 'SALES',
    summary: `Today: ${salesToday?.count || 0} orders, LKR ${Number(salesToday?.total || 0).toLocaleString('en-LK')} revenue.`,
    recommendations: recs,
    metrics: { pendingCod: codCount, ordersToday: salesToday?.count || 0 },
  };
}

export async function runInventoryAgent(): Promise<AgentResult> {
  const lowStock = await db
    .select({ name: products.name, onHand: stockBalances.onHand, reorder: products.reorderLevel })
    .from(stockBalances)
    .innerJoin(products, eq(products.id, stockBalances.productId))
    .where(sql`${stockBalances.onHand} <= ${products.reorderLevel}`)
    .limit(8);

  return {
    agent: 'INVENTORY',
    summary: `${lowStock.length} SKU(s) at or below reorder level.`,
    recommendations: lowStock.length
      ? lowStock.map(
          (r) => `Draft PO line: ${r.name} (${Number(r.onHand)} on hand, reorder ${Number(r.reorder)}).`,
        )
      : ['Stock levels healthy — review weekend promo demand.'],
    metrics: { lowStockCount: lowStock.length },
  };
}

export async function runMarketingAgent(): Promise<AgentResult> {
  return {
    agent: 'MARKETING',
    summary: 'Brand brain + automation hooks reviewed for omnichannel promo.',
    recommendations: [
      'Run WELCOME500 on homepage announcement bar.',
      'Link /shop/repairs promo block in hero secondary CTA.',
      'Approve a creative campaign to refresh hero copy.',
    ],
  };
}

export async function runRepairAgent(): Promise<AgentResult> {
  const openRepairs = await db
    .select({
      ticket: repairJobs.jobNumber,
      status: repairJobs.status,
      device: repairJobs.deviceModel,
      customer: repairJobs.customerName,
    })
    .from(repairJobs)
    .where(sql`${repairJobs.status} NOT IN ('DELIVERED', 'CANCELLED')`)
    .orderBy(desc(repairJobs.createdAt))
    .limit(8);

  const awaiting = openRepairs.filter((r) =>
    ['INTAKE', 'AWAITING_APPROVAL', 'ESTIMATE_SENT'].includes(String(r.status)),
  );
  const ready = openRepairs.filter((r) => r.status === 'READY');

  return {
    agent: 'REPAIR',
    summary: `${openRepairs.length} open ticket(s); ${awaiting.length} need estimate/approval; ${ready.length} ready for pickup.`,
    recommendations: openRepairs.length
      ? [
          ...openRepairs.slice(0, 4).map(
            (r) => `Ticket ${r.ticket} (${r.device}) — ${r.status}: contact ${r.customer}.`,
          ),
          ...(ready.length ? [`${ready.length} device(s) ready — trigger REPAIR_READY WhatsApp.`] : []),
        ]
      : ['Promote /shop/repairs on storefront hero.', 'Review screen/battery spare parts stock.'],
    metrics: { open: openRepairs.length, awaiting: awaiting.length, ready: ready.length },
  };
}

export async function runRestaurantAgent(): Promise<AgentResult> {
  const tables = await db.select().from(diningTables).where(eq(diningTables.active, true));
  const openKots = await db
    .select()
    .from(kitchenTickets)
    .where(eq(kitchenTickets.status, 'OPEN'))
    .orderBy(desc(kitchenTickets.createdAt))
    .limit(20);

  const seated = tables.filter((t) => t.status === 'SEATED' || t.status === 'ORDERED').length;
  const vacant = tables.filter((t) => t.status === 'VACANT').length;

  return {
    agent: 'RESTAURANT',
    summary: `${tables.length} tables — ${seated} active, ${vacant} vacant; ${openKots.length} open KOT(s).`,
    recommendations: openKots.length
      ? openKots.slice(0, 5).map((k) => `Fire/serve KOT ${k.kotNumber} (LKR ${Number(k.totalAmount).toLocaleString('en-LK')}).`)
      : seated > vacant
        ? ['Kitchen clear — prompt table turnover on seated tables.']
        : ['Floor has capacity — promote dine-in combos at POS.'],
    metrics: { tables: tables.length, openKots: openKots.length, seated, vacant },
  };
}

export async function runHirePurchaseAgent(): Promise<AgentResult> {
  const now = new Date();
  const contracts = await db
    .select()
    .from(hirePurchaseContracts)
    .where(sql`${hirePurchaseContracts.status} IN ('ACTIVE', 'OVERDUE')`)
    .orderBy(desc(hirePurchaseContracts.nextDueDate))
    .limit(20);

  const overdue = contracts.filter(
    (c) => c.nextDueDate && c.nextDueDate < now && c.status !== 'SETTLED',
  );
  const nearSettlement = contracts.filter(
    (c) => c.paidMonths >= c.totalMonths - 1 && c.status === 'ACTIVE',
  );

  return {
    agent: 'HIRE_PURCHASE',
    summary: `${contracts.length} active contract(s); ${overdue.length} overdue EMI(s); ${nearSettlement.length} near settlement.`,
    recommendations: [
      ...overdue.slice(0, 4).map(
        (c) => `Collect EMI LKR ${Number(c.monthlyEmi).toLocaleString('en-LK')} from ${c.customerName} (${c.contractNumber}).`,
      ),
      ...nearSettlement.slice(0, 2).map((c) => `Prepare settlement docs for ${c.contractNumber}.`),
      ...(overdue.length === 0 ? ['All EMIs current — review new HP applications.'] : []),
    ],
    metrics: { active: contracts.length, overdue: overdue.length },
  };
}

export async function runAppointmentsAgent(): Promise<AgentResult> {
  const start = startOfToday();
  const end = endOfToday();
  const tomorrow = new Date(end.getTime() + 24 * 60 * 60 * 1000);

  const todayRows = await db
    .select()
    .from(appointments)
    .where(and(gte(appointments.startsAt, start), lte(appointments.startsAt, end)))
    .orderBy(appointments.startsAt);

  const upcoming = await db
    .select()
    .from(appointments)
    .where(
      and(
        gte(appointments.startsAt, end),
        lte(appointments.startsAt, tomorrow),
        sql`${appointments.status} NOT IN ('CANCELLED', 'COMPLETED')`,
      ),
    )
    .orderBy(appointments.startsAt)
    .limit(10);

  return {
    agent: 'APPOINTMENTS',
    summary: `${todayRows.length} appointment(s) today; ${upcoming.length} in next 24h.`,
    recommendations: todayRows.length
      ? todayRows.slice(0, 5).map(
          (a) =>
            `${a.startsAt.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })} — ${a.customerName} (${a.service})`,
        )
      : ['No bookings today — open slots for walk-ins or WhatsApp booking link.'],
    metrics: { today: todayRows.length, upcoming24h: upcoming.length },
  };
}

export async function runLoyaltyAgent(): Promise<AgentResult> {
  const members = await db
    .select()
    .from(loyaltyMembers)
    .where(eq(loyaltyMembers.active, true))
    .orderBy(desc(loyaltyMembers.points))
    .limit(50);

  const highPoints = members.filter((m) => m.points >= 500);
  const nearGold = members.filter(
    (m) => m.tier === 'SILVER' && Number(m.totalSpent) >= 20000 && Number(m.totalSpent) < 25000,
  );

  return {
    agent: 'LOYALTY',
    summary: `${members.length} active member(s); ${highPoints.length} with 500+ points; ${nearGold.length} near GOLD tier.`,
    recommendations: [
      ...highPoints.slice(0, 3).map((m) => `Prompt ${m.name} to redeem ${m.points} points (${m.tier}).`),
      ...nearGold.slice(0, 2).map((m) => `${m.name} is LKR ${(25000 - Number(m.totalSpent)).toLocaleString('en-LK')} from GOLD tier.`),
      ...(highPoints.length === 0 ? ['Launch earn-double-points weekend on POS.'] : []),
    ],
    metrics: { members: members.length, highPoints: highPoints.length },
  };
}

export async function runWholesaleAgent(): Promise<AgentResult> {
  type Quote = { id: string; quoteNo?: string; clientName?: string; grandTotal?: number; validUntil?: string; status?: string };
  const quotes = await listCollection<Quote>('quotations');
  const open = quotes.filter((q) => q.status !== 'CONVERTED' && q.status !== 'VOID');
  const today = new Date().toISOString().slice(0, 10);
  const expiring = open.filter((q) => q.validUntil && q.validUntil <= today);

  return {
    agent: 'WHOLESALE',
    summary: `${open.length} open quotation(s); ${expiring.length} expired or due today.`,
    recommendations: open.length
      ? open.slice(0, 5).map(
          (q) =>
            `Follow up ${q.quoteNo || q.id} — ${q.clientName || 'Client'} LKR ${Number(q.grandTotal || 0).toLocaleString('en-LK')}.`,
        )
      : ['No open quotes — prospect top wholesale SKUs for B2B outreach.'],
    metrics: { openQuotes: open.length, expiring: expiring.length },
  };
}

export async function runPolimAgent(): Promise<AgentResult> {
  const accounts = await db
    .select()
    .from(polimPothaAccounts)
    .orderBy(desc(polimPothaAccounts.currentBalance))
    .limit(30);
  const custs = await db.select({ id: customers.id, name: customers.name }).from(customers);
  const nameById = new Map(custs.map((c) => [c.id, c.name]));

  const withBalance = accounts.filter((a) => Number(a.currentBalance) > 0);
  const nearLimit = accounts.filter((a) => {
    const bal = Number(a.currentBalance);
    const lim = Number(a.creditLimit);
    return lim > 0 && bal / lim >= 0.85;
  });

  return {
    agent: 'POLIM',
    summary: `${withBalance.length} customer(s) with outstanding credit; ${nearLimit.length} near credit limit.`,
    recommendations: withBalance.length
      ? withBalance.slice(0, 5).map((a) => {
          const name = nameById.get(a.customerId) || a.customerId;
          return `Collect LKR ${Number(a.currentBalance).toLocaleString('en-LK')} from ${name}.`;
        })
      : ['No outstanding Polim balances — credit book healthy.'],
    metrics: { outstanding: withBalance.length, nearLimit: nearLimit.length },
  };
}

export async function runWhatsappAgent(): Promise<AgentResult> {
  const logs = await listAutomationLogs(30);
  const failed = logs.filter((l) => l.status === 'FAILED');
  const cfg = await readConfigJson();
  const rules = (cfg.automationRules as unknown[] | undefined)?.length ?? 0;

  return {
    agent: 'WHATSAPP',
    summary: `${failed.length} failed automation(s) in last ${logs.length} log entries; ${rules || 'default'} rule set active.`,
    recommendations: failed.length
      ? failed.slice(0, 3).map((l) => `Fix rule ${l.ruleId} on event ${l.event}: see automation logs.`)
      : [
          'Automation healthy — verify Meta webhook in Developer Console.',
          'Test REPAIR_CREATED after /shop/repairs/request submit.',
        ],
    metrics: { failed: failed.length, logSample: logs.length },
  };
}

export async function runCreativeAgent(): Promise<AgentResult> {
  const projects = await db
    .select()
    .from(creativeProjects)
    .orderBy(desc(creativeProjects.createdAt))
    .limit(20);

  const pending = projects.filter((p) => !['COMPLETED', 'FAILED'].includes(p.status));

  return {
    agent: 'CREATIVE',
    summary: `${pending.length} creative project(s) awaiting generation or approve-to-storefront.`,
    recommendations: pending.length
      ? pending.slice(0, 4).map((p) => `Review "${p.title}" (${p.status}) — approve publish to storefront.`)
      : ['No pending campaigns — brief a repair or seasonal hero in Creative Studio.'],
    metrics: { pending: pending.length, total: projects.length },
  };
}

const HANDLERS: Record<AgentId, () => Promise<AgentResult>> = {
  SALES: runSalesAgent,
  INVENTORY: runInventoryAgent,
  MARKETING: runMarketingAgent,
  REPAIR: runRepairAgent,
  RESTAURANT: runRestaurantAgent,
  HIRE_PURCHASE: runHirePurchaseAgent,
  APPOINTMENTS: runAppointmentsAgent,
  LOYALTY: runLoyaltyAgent,
  WHOLESALE: runWholesaleAgent,
  POLIM: runPolimAgent,
  WHATSAPP: runWhatsappAgent,
  CREATIVE: runCreativeAgent,
};

export async function executeAgent(id: AgentId): Promise<AgentResult> {
  const handler = HANDLERS[id];
  if (!handler) throw new Error(`Unknown agent: ${id}`);
  return handler();
}
