import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { assertCanMutateCommerce, getSession } from '@/lib/auth/session';

/**
 * Storage upload — writes to local public/uploads when Supabase is not configured.
 * Never returns fabricated remote CDN URLs.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (process.env.NODE_ENV === 'production') assertCanMutateCommerce(session);

    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'file required' }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Max 8MB' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      const bucket = String(form.get('bucket') || 'products');
      const ext = file.name.split('.').pop() || 'bin';
      const objectPath = `${randomUUID()}.${ext}`;
      const bytes = Buffer.from(await file.arrayBuffer());
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'true',
        },
        body: bytes,
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json(
          { success: false, error: `Supabase upload failed: ${text}` },
          { status: 502 }
        );
      }
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
      return NextResponse.json({ success: true, url: publicUrl, provider: 'supabase' });
    }

    // Local fallback — real file on disk
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });
    const ext = file.name.split('.').pop() || 'bin';
    const filename = `${randomUUID()}.${ext}`;
    const dest = path.join(uploadsDir, filename);
    await writeFile(dest, Buffer.from(await file.arrayBuffer()));
    const base = process.env.NEXT_PUBLIC_APP_URL || '';
    const url = `${base}/uploads/${filename}`;
    return NextResponse.json({
      success: true,
      url,
      provider: 'local',
      warning: 'Supabase not configured — stored under public/uploads',
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ success: false, error: e.message || 'Upload failed' }, { status: 500 });
  }
}
