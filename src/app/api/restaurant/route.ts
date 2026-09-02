import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import {
  getRestaurantFloorState,
  handleRestaurantPatch,
  handleRestaurantPost,
} from '@/lib/restaurant/restaurant-service';

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function GET() {
  try {
    const state = await getRestaurantFloorState();
    return NextResponse.json({ success: true, ...state });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await actor();
    const body = await req.json();
    const result = await handleRestaurantPost(body);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    await actor();
    const body = await req.json();
    const result = await handleRestaurantPatch(body);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 400 });
  }
}
