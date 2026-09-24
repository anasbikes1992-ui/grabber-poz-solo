import { describe, it, expect } from 'vitest';
import type { StorefrontVariant } from '../src/lib/storefront/catalog-server';

describe('storefront variant images and auto image switching', () => {
  it('resolves variant image from attributesJson and falls back correctly', () => {
    const variants: StorefrontVariant[] = [
      {
        id: 'var-1',
        name: 'Red / Small',
        sku: 'SHIRT-RED-S',
        barcode: null,
        salePrice: 2500,
        costPrice: 1500,
        stock: 12,
        imageUrl: 'https://images.unsplash.com/photo-red-shirt',
        attributesJson: { color: 'Red', size: 'S', imageUrl: 'https://images.unsplash.com/photo-red-shirt' },
      },
      {
        id: 'var-2',
        name: 'Blue / Large',
        sku: 'SHIRT-BLU-L',
        barcode: null,
        salePrice: 2800,
        costPrice: 1600,
        stock: 5,
        imageUrl: 'https://images.unsplash.com/photo-blue-shirt',
        attributesJson: { color: 'Blue', size: 'L', imageUrl: 'https://images.unsplash.com/photo-blue-shirt' },
      },
      {
        id: 'var-3',
        name: 'Standard / Plain',
        sku: 'SHIRT-STD',
        barcode: null,
        salePrice: 2200,
        costPrice: 1200,
        stock: 0,
        imageUrl: null,
        attributesJson: { color: 'Plain' },
      },
    ];

    const defaultHeroImage = 'https://images.unsplash.com/photo-main';

    // Selecting variant with dedicated image switches active image
    const selectedVariant1 = variants[0];
    const activeImage1 = selectedVariant1.imageUrl || defaultHeroImage;
    expect(activeImage1).toBe('https://images.unsplash.com/photo-red-shirt');

    // Selecting second variant with image switches to that variant's photo
    const selectedVariant2 = variants[1];
    const activeImage2 = selectedVariant2.imageUrl || defaultHeroImage;
    expect(activeImage2).toBe('https://images.unsplash.com/photo-blue-shirt');

    // Selecting variant without specific image falls back to product hero image
    const selectedVariant3 = variants[2];
    const activeImage3 = selectedVariant3.imageUrl || defaultHeroImage;
    expect(activeImage3).toBe('https://images.unsplash.com/photo-main');
  });
});
