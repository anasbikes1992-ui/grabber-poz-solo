import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import path from 'path';

export type MediaAssetItem = {
  id: string;
  name: string;
  url: string;
  relativePath: string;
  sizeBytes: number;
  sizeFormatted: string;
  ext: string;
  mtime: string;
  category?: string;
};

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif']);

/**
 * Scan a directory recursively up to a given depth.
 */
async function scanDir(
  dir: string,
  basePublicDir: string,
  depth = 3,
  items: MediaAssetItem[] = []
): Promise<MediaAssetItem[]> {
  if (depth < 0) return items;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanDir(fullPath, basePublicDir, depth - 1, items);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).replace('.', '').toLowerCase();
        if (ALLOWED_EXTS.has(ext)) {
          const stats = await stat(fullPath).catch(() => null);
          if (stats) {
            const relFromPublic = path.relative(basePublicDir, fullPath).replace(/\\/g, '/');
            const cleanUrl = `/${relFromPublic.split('/').map(encodeURIComponent).join('/')}`;
            const pathParts = relFromPublic.split('/');
            const category = pathParts.length > 2 ? pathParts[pathParts.length - 2] : 'uploads';

            items.push({
              id: relFromPublic,
              name: entry.name,
              url: cleanUrl,
              relativePath: `/${relFromPublic}`,
              sizeBytes: stats.size,
              sizeFormatted: formatBytes(stats.size),
              ext,
              mtime: stats.mtime.toISOString(),
              category,
            });
          }
        }
      }
    }
  } catch {
    // Directory might not exist or not readable
  }
  return items;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '40', 10)));
    const category = searchParams.get('category')?.toLowerCase();

    const publicDir = path.join(process.cwd(), 'public');
    const generalUploadsDir = path.join(publicDir, 'uploads');
    const clientsDir = path.join(publicDir, 'uploads', 'clients');

    const allItems: MediaAssetItem[] = [];

    // Scan general uploads and all tenant/client media directories dynamically
    await scanDir(generalUploadsDir, publicDir, 4, allItems);
    await scanDir(clientsDir, publicDir, 4, allItems);

    // Deduplicate by relativePath
    const uniqueMap = new Map<string, MediaAssetItem>();
    for (const it of allItems) {
      if (!uniqueMap.has(it.relativePath)) {
        uniqueMap.set(it.relativePath, it);
      }
    }
    let list = Array.from(uniqueMap.values());

    // Apply filters
    if (query) {
      list = list.filter(
        (it) => it.name.toLowerCase().includes(query) || it.relativePath.toLowerCase().includes(query)
      );
    }
    if (category && category !== 'all') {
      list = list.filter((it) => it.category?.toLowerCase() === category);
    }

    // Sort by name or recent
    list.sort((a, b) => a.name.localeCompare(b.name));

    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      items: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      categories: ['all', 'products', 'banners', 'decorations', 'balloons'],
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ success: false, error: e.message || 'Media list failed' }, { status: 500 });
  }
}
