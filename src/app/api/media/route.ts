import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { assertCanMutateCommerce, requireStaffSession } from '@/lib/auth/session';
import {
  createMediaAssetRecord,
  deleteMediaAssetRecord,
  listMediaAssets,
  autoAlignSingleMedia,
} from '@/lib/media/media-service';

export async function GET() {
  try {
    await requireStaffSession();
    const assets = await listMediaAssets();
    return NextResponse.json({ success: true, assets });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message || 'Load failed' }, { status: e.status || 500 });
  }
}

export async function POST(req: Request) {
  try {
    assertCanMutateCommerce(await requireStaffSession());

    const form = await req.formData();
    const file = form.get('file');
    const autoAlign = form.get('autoAlign') === 'true' || form.get('autoAlign') === '1';

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'file required' }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Max 15MB' }, { status: 400 });
    }

    const originalFilename = file.name;
    const ext = originalFilename.split('.').pop() || 'png';
    const uniqueName = `${randomUUID()}.${ext}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let publicUrl = '';
    let provider = 'local';

    if (supabaseUrl && serviceKey) {
      const bucket = String(form.get('bucket') || 'products');
      const bytes = Buffer.from(await file.arrayBuffer());
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${uniqueName}`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'true',
        },
        body: bytes,
      });

      if (res.ok) {
        publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${uniqueName}`;
        provider = 'supabase';
      }
    }

    if (!publicUrl) {
      // Local fallback in public/uploads
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadsDir, { recursive: true });
      const dest = path.join(uploadsDir, uniqueName);
      await writeFile(dest, Buffer.from(await file.arrayBuffer()));
      const base = process.env.NEXT_PUBLIC_APP_URL || '';
      publicUrl = `${base}/uploads/${uniqueName}`;
      provider = 'local';
    }

    // Register media asset
    const asset = await createMediaAssetRecord({
      title: originalFilename,
      fileUrl: publicUrl,
      mimeType: file.type || 'image/jpeg',
      sizeBytes: file.size,
      source: provider === 'supabase' ? 'SUPABASE_STORAGE' : 'LOCAL_UPLOAD',
    });

    let autoAlignResult = null;
    if (autoAlign) {
      autoAlignResult = await autoAlignSingleMedia(publicUrl, originalFilename);
    }

    return NextResponse.json({
      success: true,
      asset,
      url: publicUrl,
      autoAlign: autoAlignResult,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message || 'Upload failed' }, { status: e.status || 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    assertCanMutateCommerce(await requireStaffSession());
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const deleted = await deleteMediaAssetRecord(id);
    return NextResponse.json({ success: true, deleted });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ success: false, error: e.message }, { status: e.status || 400 });
  }
}
