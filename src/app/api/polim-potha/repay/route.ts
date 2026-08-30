import { NextResponse } from 'next/server';
import { defaultCreditEngine } from '@/lib/commerce/credit-engine';
import { defaultAccountingEngine } from '@/lib/commerce/accounting-engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerId, amount, paymentMethod = 'CASH', notes = 'Counter Repayment', createdBy } = body;

    const res = defaultCreditEngine.postEntry({
      customerId,
      type: 'REPAYMENT',
      amount: Number(amount),
      notes,
      createdBy,
    });

    const journalEntry = defaultAccountingEngine.recordCustomerRepayment({
      receiptNumber: `REPAY-${res.entry.id}`,
      amount: Number(amount),
      customerId,
      paymentMethod: paymentMethod === 'CARD' ? 'CARD' : 'CASH',
      createdBy,
    });

    return NextResponse.json({
      success: true,
      entry: res.entry,
      account: res.account,
      journalEntry,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
