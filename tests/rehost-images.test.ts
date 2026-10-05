import { describe, expect, it } from 'vitest';
import { externalAttrImages, isExternalImageUrl, sniffImage, summarize } from '../scripts/lib/rehost-images.mjs';

describe('rehost-product-images helpers', () => {
  it('flags only hosts we do not control', () => {
    expect(isExternalImageUrl('https://partycare.lk/wp-content/a.jpg')).toBe(true);
    expect(isExternalImageUrl('https://images.unsplash.com/photo.jpg')).toBe(true);
    expect(isExternalImageUrl('https://abc.supabase.co/storage/v1/object/public/products/a.jpg')).toBe(false);
    expect(isExternalImageUrl('https://demo.grabberpoz.com/uploads/a.jpg')).toBe(false);
    expect(isExternalImageUrl('/uploads/a.jpg')).toBe(false);
    expect(isExternalImageUrl('data:image/png;base64,AAAA')).toBe(false);
    expect(isExternalImageUrl('not a url')).toBe(false);
    expect(isExternalImageUrl(null)).toBe(false);
  });

  it('does not treat look-alike hosts as ours', () => {
    expect(isExternalImageUrl('https://evilgrabberpoz.com/a.jpg')).toBe(true);
    expect(isExternalImageUrl('https://grabberpoz.com.evil.io/a.jpg')).toBe(true);
  });

  it('identifies images by magic bytes, not by name', () => {
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe('jpg');
    expect(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47]))?.ext).toBe('png');
    expect(sniffImage(Buffer.from('<html>not an image</html>'))).toBeNull();
    expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
  });

  it('finds external image URLs in variant attributes', () => {
    const found = externalAttrImages({ imageUrl: 'https://partycare.lk/a.jpg', color: 'red', image: '/local.jpg' });
    expect(found).toEqual([{ key: 'imageUrl', url: 'https://partycare.lk/a.jpg' }]);
    expect(externalAttrImages(null)).toEqual([]);
  });

  it('summarises outcomes', () => {
    expect(summarize([{ status: 'planned' }, { status: 'planned' }, { status: 'dead' }])).toMatchObject({ planned: 2, dead: 1 });
  });
});
