import { eq } from 'drizzle-orm';
import { db, branches, customers } from '@/db';
import type { JarvisToolExecutionResult } from './jarvis-types';

/** Pure keyword routing — no DB (for tests and fast paths). */
export function matchJarvisIntent(message: string): { toolName: string; args: Record<string, unknown> } | null {
  const q = message.toLowerCase().trim();

  if (/draft po|purchase order|restock|supplier order/.test(q)) {
    return {
      toolName: 'draft_purchase_order',
      args: { supplierId: 'pending-selection', warehouseId: 'pending-selection', items: [] },
    };
  }

  if (/draft promo|promotion|discount campaign|campaign draft/.test(q)) {
    const name = message.replace(/draft promo|promotion|discount campaign|campaign draft/gi, '').trim() || 'Seasonal promo';
    return { toolName: 'draft_promotion', args: { name, discountPercent: 10 } };
  }

  if (/draft whatsapp|broadcast|message blast|whatsapp draft/.test(q)) {
    return {
      toolName: 'draft_whatsapp_message',
      args: { audience: 'customers', message: message.slice(0, 280) || 'Hello from Grabber!' },
    };
  }

  if (/draft creative|creative campaign|storefront campaign|hero campaign/.test(q)) {
    const title = message.replace(/draft creative|creative campaign|storefront campaign|hero campaign/gi, '').trim() || 'Seasonal hero';
    return {
      toolName: 'draft_creative_campaign',
      args: { title, announcement: `New at our store: ${title}` },
    };
  }

  if (/low stock|reorder|stockout/.test(q)) {
    return { toolName: 'get_low_stock', args: { limit: 10 } };
  }

  if (/top product|best seller|top sku/.test(q)) {
    return { toolName: 'get_top_products', args: { days: 7, limit: 5 } };
  }

  if (/pending order|open order|awaiting fulfillment/.test(q)) {
    return { toolName: 'get_pending_orders', args: { limit: 10 } };
  }

  if (/sales trend|revenue trend/.test(q)) {
    return { toolName: 'get_sales_trend', args: { daysBack: 7 } };
  }

  if (/inventory snapshot|stock on hand|on hand/.test(q)) {
    return { toolName: 'get_inventory', args: { limit: 10 } };
  }

  if (/search product|find product|lookup sku/.test(q)) {
    const term = message.replace(/search product|find product|lookup sku/gi, '').trim() || 'shirt';
    return { toolName: 'search_products', args: { query: term, limit: 5 } };
  }

  if (/sales|revenue|today|performance/.test(q)) {
    return { toolName: 'get_sales_summary', args: { daysBack: 0 } };
  }

  if (/dashboard|daily brief|business brief|how are we/.test(q)) {
    return { toolName: 'get_dashboard_summary', args: {} };
  }

  return null;
}

export async function routeJarvisMessage(message: string): Promise<{ toolName: string; args: Record<string, unknown> }> {
  const q = message.toLowerCase().trim();

  if (/transfer|move stock|move inventory/.test(q)) {
    const branchRows = await db.select().from(branches).limit(2);
    return {
      toolName: 'propose_stock_transfer',
      args: {
        fromLocationId: branchRows[0]?.id || 'unknown',
        toLocationId: branchRows[1]?.id || branchRows[0]?.id || 'unknown',
        items: [{ productId: 'pending-selection', quantity: 1 }],
      },
    };
  }

  if (/polim|credit|aging|outstanding/.test(q)) {
    const [cust] = await db.select().from(customers).limit(1);
    return { toolName: 'get_customer_credit_report', args: { customerId: cust?.id || 'unknown' } };
  }

  return matchJarvisIntent(message) || { toolName: 'get_dashboard_summary', args: {} };
}

function money(n: number) {
  return `LKR ${n.toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
}

export function formatJarvisReply(result: JarvisToolExecutionResult): string {
  if (result.status === 'CONFIRMATION_REQUIRED') {
    const draftHint = result.risk === 'DRAFT' ? ' Draft queued — open /approvals to approve.' : '';
    return `${result.confirmationDetails?.actionDescription || 'Action staged.'}${draftHint} Review and confirm at /approvals.`;
  }
  if (result.status === 'BLOCKED_PERMISSION') {
    return result.errorMessage || 'You do not have permission for this action.';
  }
  if (result.status === 'ERROR') {
    return result.errorMessage || 'Something went wrong while querying the database.';
  }

  const data = result.data as Record<string, unknown> | undefined;
  if (!data) return 'Done.';

  if (result.toolName === 'get_dashboard_summary') {
    return `Today: ${data.todayBillsCount ?? 0} orders, ${money(Number(data.todayRevenue || 0))} revenue. ${data.lowStockCount ?? 0} SKUs at/below reorder level.`;
  }

  if (result.toolName === 'get_sales_summary') {
    const total = Number(data.totalRevenue || 0);
    const count = data.orderCount ?? 0;
    return `Sales summary: ${count} orders, ${money(total)} total revenue.`;
  }

  if (result.toolName === 'get_low_stock') {
    const items = (data.items || data.products || []) as Array<{ name?: string; onHand?: number }>;
    if (!items.length) return 'All monitored SKUs are above reorder levels.';
    return `Low stock alert: ${items.slice(0, 5).map((i) => `${i.name} (${i.onHand ?? 0} on hand)`).join(', ')}`;
  }

  if (result.toolName === 'get_top_products') {
    const items = (data.products || []) as Array<{ name?: string; qty?: number; revenue?: number }>;
    if (!items.length) return 'No product sales recorded for this period.';
    return `Top products: ${items.slice(0, 5).map((i) => `${i.name} (${i.qty ?? 0} sold)`).join(', ')}`;
  }

  if (result.toolName === 'get_pending_orders') {
    const items = (data.orders || []) as Array<{ orderNumber?: string; grandTotal?: number }>;
    if (!items.length) return 'No pending orders right now.';
    return `Pending orders: ${items.slice(0, 5).map((o) => `${o.orderNumber} (${money(Number(o.grandTotal || 0))})`).join(', ')}`;
  }

  if (result.toolName === 'get_customer_credit_report') {
    const account = data.account as { balance?: number; creditLimit?: number } | undefined;
    const aging = data.aging as Record<string, number> | undefined;
    if (!account) return 'No Polim Potha account found for that customer.';
    return `Polim Potha: outstanding ${money(Number(account.balance || 0))}, limit ${money(Number(account.creditLimit || 0))}. Aging buckets: ${JSON.stringify(aging || {})}`;
  }

  if (result.toolName === 'search_products') {
    const items = (data.products || data.items || []) as Array<{ name?: string; sku?: string; salePrice?: number }>;
    if (!items.length) return 'No products matched your search.';
    return items.slice(0, 5).map((p) => `${p.name} (${p.sku}) — ${money(Number(p.salePrice || 0))}`).join('\n');
  }

  if (result.toolName === 'get_sales_trend') {
    const points = (data.series || []) as Array<{ date?: string; revenue?: number }>;
    if (!points.length) return 'No sales trend data for this window.';
    return `Trend: ${points.map((p) => `${p.date}: ${money(Number(p.revenue || 0))}`).join(' · ')}`;
  }

  if (result.toolName === 'get_inventory') {
    const items = (data.products || data.items || []) as Array<{ name?: string; onHand?: number; sku?: string }>;
    if (!items.length) return 'No inventory rows returned.';
    return items.slice(0, 8).map((p) => `${p.name} (${p.sku}): ${p.onHand ?? 0} on hand`).join('\n');
  }

  if (result.toolName === 'draft_purchase_order' || result.toolName === 'draft_promotion' || result.toolName === 'draft_whatsapp_message' || result.toolName === 'draft_creative_campaign') {
    return `Draft ready: ${JSON.stringify(data).slice(0, 200)}`;
  }

  if (result.toolName === 'propose_stock_transfer' && result.status === 'EXECUTED') {
    return 'Stock transfer completed and inventory ledger updated.';
  }

  return typeof data === 'object' ? JSON.stringify(data, null, 2).slice(0, 800) : String(data);
}
