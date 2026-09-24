import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { assertCsvSize } from '@/lib/catalog/catalog-csv';
import {
  parseCatalogImportSourceSystem,
  stageCatalogImport,
} from '@/lib/catalog/catalog-import-staging';
import { persistCatalogStagingRun } from '@/lib/catalog/catalog-import-staging-service';

function warningCounts(rows: { warnings: string[] }[]) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const warning of row.warnings) {
      counts[warning] = (counts[warning] || 0) + 1;
    }
  }
  return counts;
}

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'dev@localhost',
        name: 'Dev',
        role: 'OWNER' as const,
      };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const action = String(body.action || 'dry-run');
    if (!['dry-run', 'persist-dry-run'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Unsupported catalog staging action' }, { status: 400 });
    }

    const csv = String(body.csv || '');
    assertCsvSize(csv);

    const sourceSystem = parseCatalogImportSourceSystem(String(body.sourceSystem || 'standard_csv'));
    const sourceNamespace = String(body.sourceNamespace || 'default');
    const fileName = body.fileName ? String(body.fileName) : undefined;
    const actorId =
      session?.userId && session.userId !== '00000000-0000-0000-0000-000000000001'
        ? session.userId
        : null;

    const persisted =
      action === 'persist-dry-run'
        ? await persistCatalogStagingRun({
            csv,
            sourceSystem,
            sourceNamespace,
            fileName,
            createdBy: actorId,
          })
        : null;
    const staged = persisted?.staged || stageCatalogImport(csv, sourceSystem);
    const stockCounts = staged.rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.stock.status] = (acc[row.stock.status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      sourceSystem,
      sourceNamespace,
      importRunId: persisted?.importRunId || null,
      summary: staged.summary,
      stockCounts,
      warningCounts: warningCounts(staged.rows),
      familiesPreview: staged.families.slice(0, 25).map((family) => ({
        sourceId: family.parent.sourceId,
        title: family.parent.title,
        rawSku: family.parent.rawSku,
        internalSku: family.parent.internalSku,
        children: family.children.length,
        warnings: family.parent.warnings,
      })),
      rowsPreview: staged.rows.slice(0, 50).map((row) => ({
        rowIndex: row.rowIndex,
        sourceId: row.sourceId,
        type: row.type,
        title: row.title,
        rawSku: row.rawSku,
        internalSku: row.internalSku,
        parentRaw: row.parentRaw,
        currentPrice: row.currentPrice,
        stock: row.stock,
        imageCount: row.images.length,
        warnings: row.warnings,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
