import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, requireStaffSession } from '@/lib/auth/session';
import { applyCatalogImportRun } from '@/lib/catalog/catalog-import-apply-service';

type Props = { params: Promise<{ runId: string }> };

export async function POST(req: Request, { params }: Props) {
  try {
    const session = assertCanMutateCommerce(await requireStaffSession());
    const { runId } = await params;
    const body = await req.json().catch(() => ({}));
    const approvedSourceIds = Array.isArray(body.approvedSourceIds)
      ? body.approvedSourceIds.map((id: unknown) => String(id)).filter(Boolean)
      : undefined;

    const result = await applyCatalogImportRun({
      importRunId: runId,
      approvedSourceIds,
      actorId: session.userId,
    });

    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number; details?: unknown };
    return NextResponse.json(
      { success: false, error: e.message || 'Import apply failed', details: e.details },
      { status: e.status || 400 },
    );
  }
}
