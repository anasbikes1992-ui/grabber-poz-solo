import { readFile, stat } from 'fs/promises';
import { resolveUploadPath } from '@/lib/storage/local-uploads';

export const dynamic = 'force-dynamic';

/**
 * Serve uploaded images from the uploads directory (a persistent volume in production).
 * Next's standalone server only serves files present in public/ at build time, so files
 * uploaded at runtime need this route.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await ctx.params;
  const resolved = resolveUploadPath(segments);
  if (!resolved) return new Response('Not found', { status: 404 });
  try {
    const info = await stat(resolved.filePath);
    if (!info.isFile()) return new Response('Not found', { status: 404 });
    const body = await readFile(resolved.filePath);
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': resolved.contentType,
        'Content-Length': String(info.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
