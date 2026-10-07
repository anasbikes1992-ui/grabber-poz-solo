import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { getSupabaseUrl } from '@/lib/config/app-url';

/** Public URL prefix for files in the uploads directory (served by src/app/uploads/[...path]/route.ts). */
export const UPLOADS_URL_PREFIX = '/uploads';

/** Image types we store and serve. SVG is deliberately excluded (script-capable). */
export const UPLOAD_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
};

export type StorageProvider = 'supabase' | 'local';

/**
 * Directory holding uploaded files. In Coolify mount a persistent volume here
 * (default /app/public/uploads inside the container).
 */
export function uploadsDir(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.UPLOADS_DIR || env.PUBLIC_UPLOADS_DIR;
  return path.resolve(configured || path.join(process.cwd(), 'public', 'uploads'));
}

/**
 * STORAGE_PROVIDER=local|supabase wins; otherwise Supabase when configured, else local disk.
 */
export function storageProvider(env: NodeJS.ProcessEnv = process.env): StorageProvider {
  const explicit = String(env.STORAGE_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'local' || explicit === 'supabase') return explicit;
  const supabaseUrl = env === process.env ? getSupabaseUrl() : env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  return supabaseUrl && env.SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'local';
}

/** Write a validated upload to disk and return its public path, e.g. `/uploads/<uuid>.jpg`. */
export async function saveLocalUpload(bytes: Buffer, extension: string, dir = uploadsDir()) {
  const ext = extension.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!UPLOAD_CONTENT_TYPES[ext]) throw new Error(`Unsupported upload type: ${ext}`);
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, filename), bytes);
  return { filename, relativePath: `${UPLOADS_URL_PREFIX}/${filename}` };
}

/**
 * Map URL path segments under /uploads to a file inside the uploads directory.
 * Returns null for traversal attempts, hidden files or non-image extensions.
 */
export function resolveUploadPath(segments: string[], dir = uploadsDir()) {
  if (!segments.length) return null;
  const decoded: string[] = [];
  for (const raw of segments) {
    let s: string;
    try {
      s = decodeURIComponent(raw);
    } catch {
      return null;
    }
    if (!s || s === '.' || s === '..' || s.startsWith('.') || /[\\/\0]/.test(s)) return null;
    decoded.push(s);
  }
  const ext = path.extname(decoded[decoded.length - 1]).slice(1).toLowerCase();
  const contentType = UPLOAD_CONTENT_TYPES[ext];
  if (!contentType) return null;
  const root = path.resolve(dir);
  const filePath = path.resolve(root, ...decoded);
  if (!filePath.startsWith(root + path.sep)) return null;
  return { filePath, contentType };
}
