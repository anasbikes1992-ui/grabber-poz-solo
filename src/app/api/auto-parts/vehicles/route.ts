import { NextResponse } from 'next/server';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import {
  createGeneration,
  listGenerations,
  listMakes,
  listModels,
  upsertMake,
  upsertModel,
} from '@/lib/auto-parts/service';

async function actor() {
  let session = await getSession();
  if (!session && process.env.NODE_ENV !== 'production') {
    session = { userId: '00000000-0000-0000-0000-000000000001', email: 'dev@localhost', name: 'Dev', role: 'OWNER' };
  } else {
    assertCanMutateCommerce(session);
  }
  return session!;
}

export async function GET(req: Request) {
  try {
    await actor();
    const { searchParams } = new URL(req.url);
    const makeId = searchParams.get('makeId') || undefined;
    const modelId = searchParams.get('modelId') || undefined;

    const [makes, models, generations] = await Promise.all([
      listMakes(),
      listModels(makeId),
      listGenerations(modelId),
    ]);

    return NextResponse.json({ success: true, makes, models, generations });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message, makes: [], models: [], generations: [] },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await actor();
    const body = await req.json();
    const type = String(body.type || '').toLowerCase();

    if (type === 'make') {
      const make = await upsertMake(body.name);
      return NextResponse.json({ success: true, make });
    }
    if (type === 'model') {
      const model = await upsertModel(body.makeId, body.name);
      return NextResponse.json({ success: true, model });
    }
    if (type === 'generation') {
      const generation = await createGeneration({
        modelId: body.modelId,
        name: body.name,
        yearFrom: body.yearFrom,
        yearTo: body.yearTo,
        engine: body.engine,
      });
      return NextResponse.json({ success: true, generation });
    }

    return NextResponse.json({ success: false, error: 'type must be make|model|generation' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
