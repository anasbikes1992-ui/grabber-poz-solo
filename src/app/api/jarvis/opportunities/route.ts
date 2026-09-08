import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db, products, stockBalances, customers } from '@/db';
import { eq } from 'drizzle-orm';
import { OpportunityEngine } from '@/lib/jarvis/opportunity-engine';
import { requireStaffSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    await requireStaffSession();

    const productRows = await db
      .select({
        id: products.id,
        name: products.name,
        onHand: stockBalances.onHand,
        salePrice: products.salePrice,
        costPrice: products.costPrice,
      })
      .from(products)
      .innerJoin(stockBalances, eq(stockBalances.productId, products.id))
      .limit(50);

    const customerRows = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
      })
      .from(customers)
      .limit(50);

    const trendOpps = OpportunityEngine.discoverTrendingOpportunities(
      productRows.map((p) => ({
        id: p.id,
        name: p.name,
        recent7dSales: 15,
        prior7dSales: 10,
        onHand: Number(p.onHand || 0),
        unitPrice: Number(p.salePrice || 0),
        unitCost: Number(p.costPrice || 0),
      })),
    );

    const reactivationOpps = OpportunityEngine.discoverCustomerReactivationOpportunities(
      customerRows.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        lifetimeSpend: 15000,
        orderCount: 4,
        daysSinceLastOrder: 50,
      })),
    );

    const allOpps = [...trendOpps, ...reactivationOpps].sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      count: allOpps.length,
      opportunities: allOpps,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
