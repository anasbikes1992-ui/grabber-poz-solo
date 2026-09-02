import { NextResponse } from 'next/server';
import { db } from '@/db';
import { lookupOrderTracking, lookupRepairTracking } from '@/lib/tracking/order-tracker';

/** Public passwordless order / repair tracking */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber')?.trim();
    const ticket = searchParams.get('ticket')?.trim();
    const phone = searchParams.get('phone')?.trim();
    const phoneLast4 = searchParams.get('phoneLast4')?.trim();
    const token = searchParams.get('token')?.trim();

    if (ticket && phone) {
      const repair = await lookupRepairTracking(db, ticket, phone);
      if ('error' in repair) {
        return NextResponse.json({ success: false, error: repair.error }, { status: 404 });
      }
      return NextResponse.json({ success: true, type: 'repair', ...repair });
    }

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: 'orderNumber or ticket+phone required' },
        { status: 400 },
      );
    }

    if (!phoneLast4 && !token) {
      return NextResponse.json(
        { success: false, error: 'phoneLast4 or token required' },
        { status: 400 },
      );
    }

    const result = await lookupOrderTracking(db, orderNumber, { phoneLast4, token });
    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true, type: 'order', ...result });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
