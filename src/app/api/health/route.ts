import { NextResponse } from 'next/server';

/** Lightweight health probe for optional cert / load balancers */
export async function GET() {
  return NextResponse.json({
    success: true,
    ok: true,
    service: 'grabber-business-os',
    ts: new Date().toISOString(),
  });
}

export async function POST() {
  return GET();
}
