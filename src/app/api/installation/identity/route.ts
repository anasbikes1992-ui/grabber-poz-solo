import { NextResponse } from 'next/server';
import { getPublicInstallationIdentity } from '@/lib/installation';

export async function GET() {
  try {
    const identity = await getPublicInstallationIdentity();
    return NextResponse.json({ success: true, identity });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
