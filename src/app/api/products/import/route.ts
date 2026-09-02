import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import {
  commitImportRows,
  parseProductCsv,
  validateImportRows,
  type ImportRowPreview,
} from '@/lib/catalog/product-import';
import { assertCsvSize } from '@/lib/catalog/catalog-csv';

export async function POST(req: Request) {
  try {
    let session = await getSession();
    if (!session && process.env.NODE_ENV !== 'production') {
      session = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'dev@localhost',
        name: 'Dev',
        role: 'OWNER',
      };
    } else {
      assertCanMutateCommerce(session);
    }

    const body = await req.json();
    const action = String(body.action || 'validate');

    if (action === 'validate') {
      const csv = String(body.csv || '');
      assertCsvSize(csv);
      const parsed = parseProductCsv(csv);
      if (!parsed.length) {
        return NextResponse.json({ success: false, error: 'No valid rows found in CSV' }, { status: 400 });
      }
      const preview = await validateImportRows(parsed);
      return NextResponse.json({ success: true, preview, total: preview.length });
    }

    if (action === 'commit') {
      const rows = (body.rows || []) as ImportRowPreview[];
      if (!rows.length) {
        return NextResponse.json({ success: false, error: 'No rows to commit' }, { status: 400 });
      }
      const summary = await commitImportRows(rows);
      return NextResponse.json({ success: true, summary });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
