import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { closeShift } from '@/lib/db/repositories/shifts-repo';
import { ESCPOSPrinterController } from '@/lib/hardware/printer';

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const shiftId = body.shiftId as string;
    if (!shiftId) {
      return NextResponse.json({ success: false, error: 'shiftId required' }, { status: 400 });
    }

    const result = await closeShift({
      shiftId,
      closingCash: Number(body.closingCash ?? 0),
      actualCard: body.actualCard != null ? Number(body.actualCard) : undefined,
    });

    let zReportHint: string | null = null;
    let escposHint: string | null = null;
    try {
      const buf = ESCPOSPrinterController.generateZReportBuffer({
        storeName: 'Grabber Store',
        registerName: result.register?.name || 'Register',
        registerCode: result.register?.code || 'REG',
        cashierName: result.cashier?.name || session!.name,
        shiftId,
        openedAt: result.shift.openedAt?.toISOString?.() || String(result.shift.openedAt),
        closedAt: result.shift.closedAt?.toISOString?.() || new Date().toISOString(),
        openingFloat: result.summary.openingFloat,
        cashSales: result.summary.cashSales,
        cardSales: result.summary.cardSales,
        creditSales: result.summary.creditSales,
        expectedCash: result.summary.expectedCash,
        closingCash: result.summary.closingCash,
        variance: result.summary.variance,
      });
      zReportHint = `ESC/POS Z-report buffer ${buf.byteLength} bytes ready`;
      escposHint = Buffer.from(buf).toString('base64');
    } catch {
      zReportHint = null;
    }

    return NextResponse.json({
      success: true,
      shift: result.shift,
      totals: {
        cashSales: result.summary.cashSales,
        cardSales: result.summary.cardSales,
        creditSales: result.summary.creditSales,
        orderCount: undefined,
        expectedCash: result.summary.expectedCash,
        variance: result.summary.variance,
      },
      summary: result.summary,
      zReportHint,
      escposHint,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 400 });
  }
}
