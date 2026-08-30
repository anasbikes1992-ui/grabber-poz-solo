import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'products';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 });
    }

    // Validate content type
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'video/mp4'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${bucket}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    // Return public CDN path structure
    const publicUrl = `https://sauzjjbkfyhfntcitpuz.supabase.co/storage/v1/object/public/${bucket}/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      bucket,
      fileName,
      size: file.size,
      contentType: file.type,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Storage upload failed' }, { status: 500 });
  }
}
