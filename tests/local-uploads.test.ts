import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { GET } from '@/app/uploads/[...path]/route';
import { resolveUploadPath, saveLocalUpload, storageProvider, uploadsDir } from '@/lib/storage/local-uploads';

const dir = () => mkdtempSync(path.join(tmpdir(), 'uploads-'));
const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

describe('local uploads: path resolution', () => {
  const root = dir();
  it('maps normal image paths inside the uploads dir', () => {
    expect(resolveUploadPath(['a.jpg'], root)?.contentType).toBe('image/jpeg');
    expect(resolveUploadPath(['clients', 'shop', 'p.webp'], root)?.filePath).toBe(path.join(root, 'clients', 'shop', 'p.webp'));
  });

  it('rejects traversal, hidden files and non-images', () => {
    for (const segs of [['..', 'etc', 'passwd.png'], ['%2e%2e', 'x.png'], ['a', '..%2F..%2Fx.png'], ['.env.png'], ['a.svg'], ['a.html'], ['a.jpg.php'], [], ['a\\b.png'], ['%00.png']]) {
      expect(resolveUploadPath(segs, root)).toBeNull();
    }
  });
});

describe('local uploads: storing and serving', () => {
  it('stores a validated image and returns a /uploads path', async () => {
    const d = dir();
    const { filename, relativePath } = await saveLocalUpload(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'jpg', d);
    expect(relativePath).toBe(`/uploads/${filename}`);
    expect(readFileSync(path.join(d, filename))[0]).toBe(0xff);
    await expect(saveLocalUpload(Buffer.from('x'), 'svg', d)).rejects.toThrow(/Unsupported/);
    await expect(saveLocalUpload(Buffer.from('x'), 'php', d)).rejects.toThrow(/Unsupported/);
  });

  it('serves files with safe headers and 404s everything else', async () => {
    const d = dir();
    process.env.UPLOADS_DIR = d;
    try {
      mkdirSync(path.join(d, 'clients'), { recursive: true });
      writeFileSync(path.join(d, 'clients', 'p.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      const ok = await GET(new Request('http://x/uploads/clients/p.png'), { params: Promise.resolve({ path: ['clients', 'p.png'] }) });
      expect(ok.status).toBe(200);
      expect(ok.headers.get('content-type')).toBe('image/png');
      expect(ok.headers.get('x-content-type-options')).toBe('nosniff');
      expect(ok.headers.get('cache-control')).toContain('immutable');

      for (const segs of [['missing.png'], ['..', 'x.png'], ['clients']]) {
        const res = await GET(new Request('http://x/uploads'), { params: Promise.resolve({ path: segs }) });
        expect(res.status).toBe(404);
      }
    } finally {
      delete process.env.UPLOADS_DIR;
    }
  });
});

describe('local uploads: provider and directory selection', () => {
  it('explicit STORAGE_PROVIDER wins', () => {
    expect(storageProvider(env({ STORAGE_PROVIDER: 'local', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }))).toBe('local');
    expect(storageProvider(env({ STORAGE_PROVIDER: 'supabase' }))).toBe('supabase');
  });

  it('defaults to supabase only when fully configured, otherwise local', () => {
    expect(storageProvider(env({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }))).toBe('supabase');
    expect(storageProvider(env({ SUPABASE_URL: 'https://x.supabase.co' }))).toBe('local');
    expect(storageProvider(env({}))).toBe('local');
  });

  it('uses UPLOADS_DIR, then PUBLIC_UPLOADS_DIR, then public/uploads', () => {
    expect(uploadsDir(env({ UPLOADS_DIR: '/data/u', PUBLIC_UPLOADS_DIR: '/other' }))).toBe('/data/u');
    expect(uploadsDir(env({ PUBLIC_UPLOADS_DIR: '/other' }))).toBe('/other');
    expect(uploadsDir(env({}))).toBe(path.join(process.cwd(), 'public', 'uploads'));
  });
});
