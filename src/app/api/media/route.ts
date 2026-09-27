import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { assertCanMutateCommerce, requireStaffSession } from '@/lib/auth/session';
import { getAppUrl, getSupabaseUrl } from '@/lib/config/app-url';
import { publicErrorResponse, validationErrorResponse } from '@/lib/api/http-errors';
import { safeUploadBucket, validateUploadFile } from '@/lib/security/upload-validation';
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
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Request failed' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Load failed', logMessage: 'Media load failed' });
  }
}

export async function POST(req: Request) {
  try {
    assertCanMutateCommerce(await requireStaffSession());

    const form = await req.formData();
    const file = form.get('file');
    const autoAlign = form.get('autoAlign') === 'true' || form.get('autoAlign') === '1';

    if (!file || !(file instanceof File)) {
      return validationErrorResponse('file required');
    }
    const upload = await validateUploadFile(file, 15 * 1024 * 1024);

    const originalFilename = upload.originalName;
    const uniqueName = `${randomUUID()}.${upload.extension}`;

    const supabaseUrl = getSupabaseUrl();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let publicUrl = '';
    let provider = 'local';

    if (supabaseUrl && serviceKey) {
      const bucket = safeUploadBucket(form.get('bucket'), 'products');
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${uniqueName}`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': upload.mimeType,
          'x-upsert': 'true',
        },
        body: new Blob([new Uint8Array(upload.bytes)], { type: upload.mimeType }),
      });

      if (res.ok) {
        publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${uniqueName}`;
        provider = 'supabase';
      } else {
        console.error('Supabase media upload failed', { status: res.status, body: await res.text().catch(() => '') });
      }
    }

    if (!publicUrl) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ success: false, error: 'Upload storage is not configured' }, { status: 503 });
      }
      // Local fallback in public/uploads
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadsDir, { recursive: true });
      const dest = path.join(uploadsDir, uniqueName);
      await writeFile(dest, upload.bytes);
      const base = getAppUrl();
      publicUrl = `${base}/uploads/${uniqueName}`;
      provider = 'local';
    }

    // Register media asset
    const asset = await createMediaAssetRecord({
      title: originalFilename,
      fileUrl: publicUrl,
      mimeType: upload.mimeType,
      sizeBytes: upload.bytes.length,
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
    if (err instanceof Error && /upload|file|jpg|png|webp|gif|max/i.test(err.message)) {
      return validationErrorResponse(err.message);
    }
    return publicErrorResponse(err, { message: 'Upload failed', logMessage: 'Media upload failed' });
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
    if (e.status && e.status < 500) {
      return NextResponse.json({ success: false, error: e.message || 'Request failed' }, { status: e.status });
    }
    return publicErrorResponse(err, { message: 'Delete failed', logMessage: 'Media delete failed' });
  }
}
