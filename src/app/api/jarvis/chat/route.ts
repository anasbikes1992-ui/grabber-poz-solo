import { NextResponse } from 'next/server';
import { defaultJarvisToolRegistry } from '@/lib/ai/jarvis-tools';
import { buildJarvisContext } from '@/lib/ai/jarvis-context';
import { formatJarvisReply, routeJarvisMessage } from '@/lib/ai/jarvis-chat-router';
import { getSession } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production' && !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const context = await buildJarvisContext(session);
    if (!context) {
      return NextResponse.json({ error: 'Staff session required for Jarvis tools' }, { status: 401 });
    }

    const body = await req.json();

    if (body.confirmationToken) {
      const result = await defaultJarvisToolRegistry.confirmToolExecution(body.confirmationToken);
      return NextResponse.json({ ...result, reply: formatJarvisReply(result) });
    }

    if (body.message && typeof body.message === 'string') {
      const { toolName, args } = await routeJarvisMessage(body.message);
      const result = await defaultJarvisToolRegistry.invokeTool(toolName, args, context);
      return NextResponse.json({ ...result, reply: formatJarvisReply(result), routedTool: toolName });
    }

    if (!body.toolName) {
      return NextResponse.json({
        message: 'Jarvis grounded copilot ready. Send message or pass toolName.',
        user: { id: context.userId, role: context.role },
        availableTools: [
          'get_dashboard_summary',
          'get_sales_summary',
          'get_sales_trend',
          'get_top_products',
          'get_low_stock',
          'get_inventory',
          'get_pending_orders',
          'get_customer',
          'get_customer_orders',
          'get_product',
          'search_products',
        ],
      });
    }

    const result = await defaultJarvisToolRegistry.invokeTool(body.toolName, body.args || {}, context);
    return NextResponse.json({ ...result, reply: formatJarvisReply(result) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Jarvis error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const session = await getSession();
  if (process.env.NODE_ENV === 'production' && !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const context = await buildJarvisContext(session);
  return NextResponse.json({
    ok: true,
    grounded: true,
    session: context
      ? { userId: context.userId, role: context.role, branches: context.assignedBranchIds.length }
      : null,
  });
}
