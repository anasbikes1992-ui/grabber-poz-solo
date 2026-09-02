/**
 * DB-grounded Jarvis tools — all metrics from Postgres via Drizzle.
 * Single source of truth: same tables as POS, dashboard, and reports.
 */
import { and, desc, eq, gte, inArray, ilike, ne, or } from 'drizzle-orm';
import {
  db,
  branches,
  customers,
  orderItems,
  orders,
  products,
  stockBalances,
} from '@/db';
import type { JarvisToolDefinition } from './jarvis-types';
import { completedOrderFilter, daysAgo, startOfToday, sumOrderRevenue } from '@/lib/commerce/sales-metrics';

export const JARVIS_DB_TOOLS: JarvisToolDefinition[] = [
  {
    name: 'get_dashboard_summary',
    description: 'Today revenue, bill count, low stock count, and top products sold today.',
    risk: 'READ',
    execute: async () => {
      const today = startOfToday();
      const [branch] = await db.select().from(branches).limit(1);
      const todayOrders = await db
        .select({ id: orders.id, grandTotal: orders.grandTotal })
        .from(orders)
        .where(completedOrderFilter(today));
      const revenue = sumOrderRevenue(todayOrders);
      const productRows = await db
        .select({ id: products.id, reorderLevel: products.reorderLevel })
        .from(products)
        .where(eq(products.isActive, true));
      const stocks = branch
        ? await db.select().from(stockBalances).where(eq(stockBalances.locationId, branch.id))
        : await db.select().from(stockBalances).limit(500);
      const stockMap = new Map(stocks.map((s) => [s.productId, s.onHand]));
      let lowStock = 0;
      for (const p of productRows) {
        const onHand = stockMap.get(p.id) ?? 0;
        if (onHand < (p.reorderLevel ?? 10)) lowStock++;
      }
      return {
        todayRevenue: revenue,
        todayBillsCount: todayOrders.length,
        lowStockCount: lowStock,
        branchId: branch?.id ?? null,
      };
    },
  },
  {
    name: 'get_sales_summary',
    description: 'Sales totals for today or a date range (daysBack default 0 = today only).',
    risk: 'READ',
    execute: async (args: { daysBack?: number }) => {
      const daysBack = Math.min(Math.max(args?.daysBack ?? 0, 0), 90);
      const from = daysBack === 0 ? startOfToday() : daysAgo(daysBack);
      const rows = await db
        .select({
          grandTotal: orders.grandTotal,
          channel: orders.channel,
          orderStatus: orders.orderStatus,
        })
        .from(orders)
        .where(completedOrderFilter(from));
      const total = sumOrderRevenue(rows);
      const byChannel: Record<string, number> = {};
      for (const r of rows) {
        const ch = String(r.channel || 'UNKNOWN');
        byChannel[ch] = (byChannel[ch] || 0) + Number(r.grandTotal || 0);
      }
      return { from: from.toISOString(), orderCount: rows.length, totalRevenue: total, byChannel };
    },
  },
  {
    name: 'get_sales_trend',
    description: 'Daily revenue for the last N days (default 7, max 30).',
    risk: 'READ',
    execute: async (args: { days?: number }) => {
      const days = Math.min(Math.max(args?.days ?? 7, 1), 30);
      const from = daysAgo(days);
      const rows = await db
        .select({ grandTotal: orders.grandTotal, createdAt: orders.createdAt })
        .from(orders)
        .where(
          and(gte(orders.createdAt, from), ne(orders.orderStatus, 'DRAFT'), ne(orders.orderStatus, 'CANCELLED')),
        );
      const daily = new Map<string, number>();
      for (const r of rows) {
        const key = r.createdAt.toISOString().slice(0, 10);
        daily.set(key, (daily.get(key) || 0) + Number(r.grandTotal || 0));
      }
      return {
        days,
        series: Array.from(daily.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, revenue]) => ({ date, revenue })),
      };
    },
  },
  {
    name: 'get_top_products',
    description: 'Top selling products by revenue for today or last N days.',
    risk: 'READ',
    execute: async (args: { days?: number; limit?: number }) => {
      const days = Math.min(Math.max(args?.days ?? 1, 1), 30);
      const limit = Math.min(Math.max(args?.limit ?? 5, 1), 20);
      const from = days === 1 ? startOfToday() : daysAgo(days);
      const orderRows = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(gte(orders.createdAt, from), ne(orders.orderStatus, 'DRAFT'), ne(orders.orderStatus, 'CANCELLED')),
        );
      if (!orderRows.length) return { products: [] };
      const ids = orderRows.map((o) => o.id);
      const lines = await db
        .select({
          name: products.name,
          sku: products.sku,
          quantity: orderItems.quantity,
          lineTotal: orderItems.lineTotal,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(inArray(orderItems.orderId, ids));
      const agg = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();
      for (const l of lines) {
        const key = l.sku;
        const cur = agg.get(key) || { name: l.name, sku: l.sku, qty: 0, revenue: 0 };
        cur.qty += l.quantity;
        cur.revenue += Number(l.lineTotal || 0);
        agg.set(key, cur);
      }
      const productsList = Array.from(agg.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
      return { days, products: productsList };
    },
  },
  {
    name: 'get_low_stock',
    description: 'Products below reorder level at the main branch.',
    risk: 'READ',
    execute: async (args: { limit?: number }) => {
      const limit = Math.min(Math.max(args?.limit ?? 10, 1), 50);
      const [branch] = await db.select().from(branches).limit(1);
      const productRows = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          reorderLevel: products.reorderLevel,
        })
        .from(products)
        .where(eq(products.isActive, true));
      const stocks = branch
        ? await db.select().from(stockBalances).where(eq(stockBalances.locationId, branch.id))
        : [];
      const stockMap = new Map(stocks.map((s) => [s.productId, s.onHand]));
      const low = productRows
        .map((p) => ({
          name: p.name,
          sku: p.sku,
          onHand: stockMap.get(p.id) ?? 0,
          reorderLevel: p.reorderLevel ?? 10,
        }))
        .filter((p) => p.onHand < p.reorderLevel)
        .sort((a, b) => a.onHand - b.onHand)
        .slice(0, limit);
      return { branchId: branch?.id ?? null, items: low };
    },
  },
  {
    name: 'get_inventory',
    description: 'On-hand stock for active products at main branch.',
    risk: 'READ',
    execute: async (args: { limit?: number }) => {
      const limit = Math.min(Math.max(args?.limit ?? 20, 1), 100);
      const [branch] = await db.select().from(branches).limit(1);
      const rows = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          salePrice: products.salePrice,
        })
        .from(products)
        .where(eq(products.isActive, true))
        .limit(limit);
      const stocks = branch
        ? await db.select().from(stockBalances).where(eq(stockBalances.locationId, branch.id))
        : [];
      const stockMap = new Map(stocks.map((s) => [s.productId, s.onHand]));
      return {
        branchId: branch?.id ?? null,
        items: rows.map((p) => ({
          sku: p.sku,
          name: p.name,
          onHand: stockMap.get(p.id) ?? 0,
          salePrice: Number(p.salePrice),
        })),
      };
    },
  },
  {
    name: 'get_pending_orders',
    description: 'Orders not yet delivered or cancelled.',
    risk: 'READ',
    execute: async (args: { limit?: number }) => {
      const limit = Math.min(Math.max(args?.limit ?? 20, 1), 50);
      const rows = await db
        .select({
          orderNumber: orders.orderNumber,
          channel: orders.channel,
          orderStatus: orders.orderStatus,
          fulfillmentStatus: orders.fulfillmentStatus,
          grandTotal: orders.grandTotal,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          and(
            ne(orders.orderStatus, 'DELIVERED'),
            ne(orders.orderStatus, 'CANCELLED'),
            ne(orders.orderStatus, 'DRAFT'),
          ),
        )
        .orderBy(desc(orders.createdAt))
        .limit(limit);
      return { count: rows.length, orders: rows };
    },
  },
  {
    name: 'get_customer',
    description: 'Look up customer by phone or partial name.',
    risk: 'READ',
    execute: async (args: { phone?: string; name?: string }) => {
      const phone = args?.phone?.trim();
      const name = args?.name?.trim();
      if (!phone && !name) throw new Error('Provide phone or name');
      const conditions = [];
      if (phone) conditions.push(eq(customers.phone, phone));
      if (name) conditions.push(ilike(customers.name, `%${name}%`));
      const [row] = await db
        .select()
        .from(customers)
        .where(conditions.length === 1 ? conditions[0] : or(...conditions)!)
        .limit(1);
      if (!row) return { found: false };
      return {
        found: true,
        customer: {
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email,
          segment: row.segment,
          creditLimit: Number(row.creditLimit),
          active: row.active,
        },
      };
    },
  },
  {
    name: 'get_customer_orders',
    description: 'Recent orders for a customer ID.',
    risk: 'READ',
    execute: async (args: { customerId: string; limit?: number }) => {
      if (!args?.customerId) throw new Error('customerId required');
      const limit = Math.min(Math.max(args?.limit ?? 10, 1), 50);
      const rows = await db
        .select({
          orderNumber: orders.orderNumber,
          grandTotal: orders.grandTotal,
          orderStatus: orders.orderStatus,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.customerId, args.customerId))
        .orderBy(desc(orders.createdAt))
        .limit(limit);
      return { customerId: args.customerId, orders: rows };
    },
  },
  {
    name: 'get_product',
    description: 'Find product by SKU, barcode, or name fragment.',
    risk: 'READ',
    execute: async (args: { sku?: string; barcode?: string; name?: string }) => {
      const sku = args?.sku?.trim();
      const barcode = args?.barcode?.trim();
      const name = args?.name?.trim();
      if (!sku && !barcode && !name) throw new Error('Provide sku, barcode, or name');
      const conditions = [];
      if (sku) conditions.push(eq(products.sku, sku));
      if (barcode) conditions.push(eq(products.barcode, barcode));
      if (name) conditions.push(ilike(products.name, `%${name}%`));
      const [row] = await db
        .select()
        .from(products)
        .where(conditions.length === 1 ? conditions[0] : or(...conditions)!)
        .limit(1);
      if (!row) return { found: false };
      return {
        found: true,
        product: {
          id: row.id,
          name: row.name,
          sku: row.sku,
          barcode: row.barcode,
          salePrice: Number(row.salePrice),
          costPrice: Number(row.costPrice),
          isActive: row.isActive,
          slug: row.slug,
        },
      };
    },
  },
  {
    name: 'search_products',
    description: 'Search active products by name or SKU fragment.',
    risk: 'READ',
    execute: async (args: { query: string; limit?: number }) => {
      const q = args?.query?.trim();
      if (!q) throw new Error('query required');
      const limit = Math.min(Math.max(args?.limit ?? 10, 1), 30);
      const needle = `%${q}%`;
      const rows = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          salePrice: products.salePrice,
        })
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            or(ilike(products.name, needle), ilike(products.sku, needle), ilike(products.barcode, needle)),
          ),
        )
        .limit(limit);
      return { query: q, results: rows };
    },
  },
  {
    name: 'list_customers_by_segment',
    description: 'List customers in a CRM segment (NEW, SILVER, GOLD, VIP, LAPSED, or ALL).',
    risk: 'READ',
    execute: async (args: { segment?: string; limit?: number }) => {
      const seg = String(args?.segment || 'ALL').trim().toUpperCase();
      const limit = Math.min(Math.max(args?.limit ?? 20, 1), 100);
      const rows =
        seg === 'ALL'
          ? await db.select().from(customers).where(eq(customers.active, true)).limit(limit)
          : await db
              .select()
              .from(customers)
              .where(and(eq(customers.segment, seg), eq(customers.active, true)))
              .limit(limit);
      return {
        segment: seg,
        count: rows.length,
        customers: rows.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          segment: c.segment,
        })),
      };
    },
  },
];
