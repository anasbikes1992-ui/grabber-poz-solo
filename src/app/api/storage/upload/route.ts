import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';
import { getAppUrl, getSupabaseUrl } from '@/lib/config/app-url';
import { publicErrorResponse, validationErrorResponse } from '@/lib/api/http-errors';
import { safeUploadBucket, validateUploadFile } from '@/lib/security/upload-validation';
import { saveLocalUpload, storageProvider } from '@/lib/storage/local-uploads';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') assertCanMutateCommerce(session);

    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return validationErrorResponse('file required');
    }

    const upload = await validateUploadFile(file, 8 * 1024 * 1024);
    const sizeFormatted = upload.bytes.length > 1024 * 1024
      ? `${(upload.bytes.length / (1024 * 1024)).toFixed(1)} MB`
      : `${(upload.bytes.length / 1024).toFixed(1)} KB`;

    const supabaseUrl = getSupabaseUrl();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (storageProvider() === 'supabase' && supabaseUrl && serviceKey) {
      const bucket = safeUploadBucket(form.get('bucket'), 'products');
      const objectPath = `${randomUUID()}.${upload.extension}`;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': upload.mimeType,
          'x-upsert': 'true',
        },
        body: new Blob([new Uint8Array(upload.bytes)], { type: upload.mimeType }),
      });

      if (!res.ok) {
        console.error('Supabase upload failed', { status: res.status, body: await res.text().catch(() => '') });
        return NextResponse.json({ success: false, error: 'Upload provider failed' }, { status: 502 });
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
      return NextResponse.json({
        success: true,
        url: publicUrl,
        provider: 'supabase',
        name: upload.originalName,
        sizeBytes: upload.bytes.length,
        sizeFormatted,
        relativePath: publicUrl,
      });
    }

    // Local disk (persistent volume in production), served by /uploads/[...path].
    const { relativePath } = await saveLocalUpload(upload.bytes, upload.extension);
    return NextResponse.json({
      success: true,
      url: `${getAppUrl()}${relativePath}`,
      relativePath,
      name: upload.originalName,
      sizeBytes: upload.bytes.length,
      sizeFormatted,
      provider: 'local',
    });
  } catch (err: unknown) {
    if (err instanceof Error && /upload|file|jpg|png|webp|gif|max/i.test(err.message)) {
      return validationErrorResponse(err.message);
    }
    return publicErrorResponse(err, { message: 'Upload failed', logMessage: 'Storage upload failed' });
  }
}
