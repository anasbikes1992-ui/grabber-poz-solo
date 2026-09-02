import { NextResponse } from 'next/server';
import { comparePartQualities, lookupRepairCatalogQuote } from '@/lib/repairs/catalog';
import type { RepairCategoryId } from '@/lib/repairs/device-tree';
import type { PartQuality } from '@/lib/repairs/catalog';

/** Public repair cost estimator — OEM vs Grade A side-by-side */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const brand = url.searchParams.get('brand')?.trim();
  const deviceModel = url.searchParams.get('model')?.trim();
  const repairCategory = url.searchParams.get('category')?.trim() as RepairCategoryId | null;
  const partQuality = url.searchParams.get('partQuality')?.trim() as PartQuality | null;

  if (!brand || !deviceModel || !repairCategory) {
    return NextResponse.json(
      { success: false, error: 'brand, model, category query params required' },
      { status: 400 },
    );
  }

  if (partQuality) {
    const quote = lookupRepairCatalogQuote({ brand, deviceModel, repairCategory, partQuality });
    return NextResponse.json({ success: true, quote });
  }

  const comparison = comparePartQualities({ brand, deviceModel, repairCategory });
  return NextResponse.json({ success: true, comparison });
}
