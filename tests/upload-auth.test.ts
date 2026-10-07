import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/session', async (orig) => {
  const actual = await orig<typeof import('@/lib/auth/session')>();
  return {
    ...actual,
    getSession: vi.fn(async () => null),
    requireStaffSession: vi.fn(async () => {
      throw Object.assign(new Error('Unauthorized'), { status: 401 });
    }),
  };
});
vi.mock('@/lib/media/media-service', () => ({
  createMediaAssetRecord: vi.fn(),
  deleteMediaAssetRecord: vi.fn(),
  listMediaAssets: vi.fn(),
  autoAlignSingleMedia: vi.fn(),
}));

import { POST as uploadPost } from '@/app/api/storage/upload/route';
import { POST as mediaPost } from '@/app/api/media/route';

const body = () => {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' }), 'a.jpg');
  return form;
};

afterEach(() => vi.unstubAllEnvs());

describe('upload routes reject anonymous callers with 401, not 500', () => {
  it('/api/storage/upload', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await uploadPost(new Request('http://x/api/storage/upload', { method: 'POST', body: body() }));
    expect(res.status).toBe(401);
  });

  it('/api/media', async () => {
    const res = await mediaPost(new Request('http://x/api/media', { method: 'POST', body: body() }));
    expect(res.status).toBe(401);
  });
});
