import { sql } from 'drizzle-orm';
import { db, orders, stockBalances, products } from '@/db';
import { mergeConfigJson, readConfigJson } from '@/lib/config/business-settings';

export type AgentTask = {
  agent: 'SALES' | 'INVENTORY' | 'MARKETING';
  prompt: string;
};

export type AgentResult = {
  agent: AgentTask['agent'];
  summary: string;
  recommendations: string[];
};

type AgentLog = {
  id: string;
  agent: AgentTask['agent'];
  summary: string;
  createdAt: string;
};

async function appendAgentLog(entry: Omit<AgentLog, 'id' | 'createdAt'>) {
  const cfg = await readConfigJson();
  const rows = (cfg.agentLogs as AgentLog[] | undefined) || [];
  const row: AgentLog = {
    ...entry,
    id: `agent_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  await mergeConfigJson({ agentLogs: [row, ...rows].slice(0, 100) });
  return row;
}

export async function runAgentTaskDb(task: AgentTask): Promise<AgentResult> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (task.agent === 'SALES') {
    const [salesToday] = await db
      .select({ total: sql<string>`coalesce(sum(${orders.grandTotal}), 0)`, count: sql<number>`count(*)` })
      .from(orders)
      .where(sql`${orders.createdAt} >= ${todayStart} AND ${orders.orderStatus} != 'DRAFT'`);

    const result: AgentResult = {
      agent: 'SALES',
      summary: `Today: ${salesToday?.count || 0} orders, LKR ${Number(salesToday?.total || 0).toLocaleString('en-LK')} revenue.`,
      recommendations: [
        'Follow up on pending storefront COD orders within 2 hours.',
        'Promote top 3 SKUs with healthy margin in the hero banner.',
      ],
    };
    await appendAgentLog({ agent: task.agent, summary: result.summary });
    return result;
  }

  if (task.agent === 'INVENTORY') {
    const lowStock = await db
      .select({ name: products.name, onHand: stockBalances.onHand })
      .from(stockBalances)
      .innerJoin(products, sql`${products.id} = ${stockBalances.productId}`)
      .where(sql`${stockBalances.onHand} <= ${products.reorderLevel}`)
      .limit(5);

    const result: AgentResult = {
      agent: 'INVENTORY',
      summary: `${lowStock.length} SKUs at/below reorder level.`,
      recommendations: lowStock.length
        ? lowStock.map((r) => `Replenish ${r.name} (${Number(r.onHand)} on hand).`)
        : ['Stock levels healthy — review weekend promo demand.'],
    };
    await appendAgentLog({ agent: task.agent, summary: result.summary });
    return result;
  }

  const result: AgentResult = {
    agent: 'MARKETING',
    summary: 'Marketing agent reviewed brand brain + automation hooks.',
    recommendations: [
      'Run WELCOME500 promo on homepage announcement bar.',
      'Schedule WhatsApp order confirmation template for storefront COD.',
      'Approve a creative campaign to update hero banner.',
    ],
  };
  await appendAgentLog({ agent: task.agent, summary: result.summary });
  return result;
}

export async function runAgentTask(task: AgentTask): Promise<AgentResult> {
  return runAgentTaskDb(task);
}
