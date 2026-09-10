/**
 * Jarvis intent router — v1 is keyword-only (no LLM).
 * JAR-08 (future): pluggable LLM provider with budget + guardrails; do not add without owner OK.
 */
import { eq } from 'drizzle-orm';
import { db, branches, customers } from '@/db';
import type { JarvisToolExecutionResult } from './jarvis-types';

/** Pure keyword routing — no DB (for tests and fast paths). */
export function matchJarvisIntent(message: string): { toolName: string; args: Record<string, unknown> } | null {
  const q = message.toLowerCase().trim();

  // 1. Purchase Orders & Restocking
  if (/draft po|purchase order|\brestock\b|supplier order|order more stock/.test(q)) {
    return {
      toolName: 'draft_purchase_order',
      args: { supplierId: 'pending-selection', warehouseId: 'pending-selection', items: [] },
    };
  }

  // 2. Promotions & Discounts
  if (/draft promo|promotion|\bpromo\b|discount campaign|campaign draft|create discount/.test(q)) {
    const name = message.replace(/draft promo|promotion|promo|discount campaign|campaign draft|create discount/gi, '').trim() || 'Seasonal promo';
    return { toolName: 'draft_promotion', args: { name, discountPercent: 10 } };
  }

  // 3. WhatsApp Broadcasts
  if (/draft whatsapp|broadcast|message blast|whatsapp draft|send whatsapp/.test(q)) {
    const SEG = ['VIP', 'GOLD', 'SILVER', 'NEW', 'LAPSED', 'ALL'] as const;
    const found = SEG.find((s) => new RegExp(`\\b${s}\\b`, 'i').test(message));
    const audience = found || 'ALL';
    const cleaned = message
      .replace(/draft whatsapp|broadcast|message blast|whatsapp draft|send whatsapp/gi, '')
      .replace(new RegExp(`\\b(${SEG.join('|')})\\b`, 'gi'), '')
      .replace(/\b(to|for|segment|customers?|audience)\b/gi, '')
      .trim();
    return {
      toolName: 'draft_whatsapp_message',
      args: {
        audience,
        message: (cleaned || message).slice(0, 280) || 'Hello from Grabber!',
      },
    };
  }

  // 4. Creative Marketing Campaigns
  if (/draft creative|creative campaign|storefront campaign|hero campaign|banner/.test(q)) {
    const title = message.replace(/draft creative|creative campaign|storefront campaign|hero campaign|banner/gi, '').trim() || 'Seasonal hero';
    return {
      toolName: 'draft_creative_campaign',
      args: { title, announcement: `New at our store: ${title}` },
    };
  }

  // 5. Low Stock / Reorder Alerts
  if (/low.*(stock|item|product|sku)|(stock|item|product|sku).*low|reorder|stockout|out of stock|shortage|almost empty/i.test(q)) {
    return { toolName: 'get_low_stock', args: { limit: 10 } };
  }

  // 6. Total Value of Goods / Stock Valuation
  if (/value.*(good|stock|inventory|asset|item)|(good|stock|inventory|asset|item).*value|worth.*(stock|inventory|good)|inventory worth|total worth/i.test(q)) {
    return { toolName: 'get_inventory_value', args: {} };
  }

  // 7. General Stock & Inventory on Hand
  if (/\b(inventory|stock on hand|on hand|in stock|stock level|all stock|view stock|check stock|my stock|whats (the |my )?stock|what is (the |my )?stock|get inventory)\b/i.test(q) || q === 'stock' || q === 'stocks' || q === 'inventory' || q === 'get inventory data') {
    return { toolName: 'get_inventory', args: { limit: 15 } };
  }

  // 8. Top Selling Products
  if (/top product|best seller|top sku|most sold|popular item|what sells|highest selling|best sellers/i.test(q)) {
    return { toolName: 'get_top_products', args: { days: 7, limit: 5 } };
  }

  // 9. Pending & Live Orders
  if (/\b(pending|unfulfilled|open order|awaiting fulfillment|orders to ship|orders pending|whats (the |my )?orders|what are (the |my )?orders|check orders|view orders|whats pending|what is pending|what are pending|pending order)\b/i.test(q) || q === 'orders' || q === 'order' || q === 'pending' || q.includes('pending')) {
    return { toolName: 'get_pending_orders', args: { limit: 10 } };
  }

  // 10. Sales Trend
  if (/sales trend|revenue trend|sales chart|growth trend/i.test(q)) {
    return { toolName: 'get_sales_trend', args: { daysBack: 7 } };
  }

  // 11. Product Lookup / Price Check
  if (/search product|find product|lookup sku|price of|how much is/i.test(q)) {
    const term = message.replace(/search product|find product|lookup sku|price of|how much is/gi, '').trim() || 'shirt';
    return { toolName: 'search_products', args: { query: term, limit: 5 } };
  }

  // 12. Sales & Revenue Summary
  if (/sales|revenue|today'?s? sales|earnings|income|turnover|performance/i.test(q)) {
    return { toolName: 'get_sales_summary', args: { daysBack: 0 } };
  }

  // 13. Dashboard & Brief
  if (/dashboard|daily brief|business brief|how are we|overview|summary/i.test(q)) {
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

  if (result.toolName === 'get_inventory_value') {
    const retail = Number(data.totalRetailValue || 0);
    const cost = Number(data.totalCostValue || 0);
    const units = Number(data.totalUnits || 0);
    const skus = Number(data.totalSkus || 0);
    const margin = retail > 0 ? (((retail - cost) / retail) * 100).toFixed(1) : '0';
    return `Inventory Valuation Report:\n• Total retail value: ${money(retail)}\n• Total cost basis: ${money(cost)}\n• Projected gross margin: ${margin}%\n• Stock: ${units} total units across ${skus} active SKUs.`;
  }

  if (result.toolName === 'get_inventory') {
    const items = (data.items || data.products || []) as Array<{ name?: string; onHand?: number; sku?: string; salePrice?: number }>;
    if (!items.length) return 'No active products found in inventory.';
    const totalUnits = items.reduce((s, i) => s + (i.onHand ?? 0), 0);
    const list = items.slice(0, 8).map((p) => `• ${p.name} (${p.sku}): ${p.onHand ?? 0} in stock`).join('\n');
    return `Inventory status (${totalUnits} total units on hand across ${items.length} SKUs):\n${list}`;
  }

  if (result.toolName === 'draft_purchase_order' || result.toolName === 'draft_promotion' || result.toolName === 'draft_whatsapp_message' || result.toolName === 'draft_creative_campaign') {
    return `Draft ready: ${JSON.stringify(data).slice(0, 200)}`;
  }

  if (result.toolName === 'propose_stock_transfer' && result.status === 'EXECUTED') {
    return 'Stock transfer completed and inventory ledger updated.';
  }

  return typeof data === 'object' ? JSON.stringify(data, null, 2).slice(0, 800) : String(data);
}
