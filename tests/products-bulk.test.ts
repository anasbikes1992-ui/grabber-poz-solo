import { describe, it, expect, vi } from 'vitest';

const mockProducts = [
  { id: 'prod-1', name: 'Balloon Blue', sku: 'BL-BLU', categoryId: null, isActive: true },
  { id: 'prod-2', name: 'Balloon Red', sku: 'BL-RED', categoryId: null, isActive: true },
  { id: 'prod-3', name: 'Oxford Shirt', sku: 'OX-SHT', categoryId: 'cat-1', isActive: true },
];

const mockCategories = [
  { id: 'cat-1', name: 'Apparel', slug: 'apparel', active: true },
  { id: 'cat-2', name: 'Party Balloons', slug: 'party-balloons', active: true },
];

vi.mock('@/db', () => {
  return {
    db: {
      select: (fields?: any) => ({
        from: (table: any) => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
          limit: () => Promise.resolve(mockCategories),
        }),
      }),
      insert: (table: any) => ({
        values: (val: any) => ({
          returning: () => Promise.resolve([{ id: 'new-cat-id', ...val }]),
        }),
      }),
      update: (table: any) => ({
        set: (patch: any) => ({
          where: () => ({
            returning: () => Promise.resolve([
              { id: 'prod-1', ...patch },
              { id: 'prod-2', ...patch },
            ]),
          }),
        }),
      }),
    },
    products: { id: 'id', categoryId: 'category_id', isActive: 'is_active' },
    categories: { id: 'id', name: 'name', slug: 'slug', active: 'active' },
    productVariants: { productId: 'product_id', active: 'active' },
    stockBalances: {},
    branches: {},
    taxProfiles: {},
  };
});

describe('Products Bulk Operations Logic', () => {
  it('bulkSoftDeleteProducts handles empty productIds list safely', async () => {
    const { bulkSoftDeleteProducts } = await import('@/lib/catalog/product-service');
    const result = await bulkSoftDeleteProducts([]);
    expect(result.count).toBe(0);
  });

  it('bulkSoftDeleteProducts deactivates provided product IDs', async () => {
    const { bulkSoftDeleteProducts } = await import('@/lib/catalog/product-service');
    const result = await bulkSoftDeleteProducts(['prod-1', 'prod-2']);
    expect(result.count).toBe(2);
    expect(result.productIds).toEqual(['prod-1', 'prod-2']);
  });

  it('bulkAssignCategory requires a valid category name or ID', async () => {
    const { bulkAssignCategory } = await import('@/lib/catalog/product-service');
    await expect(bulkAssignCategory(['prod-1'], '')).rejects.toThrow('Category name or ID is required');
  });

  it('bulkAssignCategory updates category assignment for items', async () => {
    const { bulkAssignCategory } = await import('@/lib/catalog/product-service');
    const result = await bulkAssignCategory(['prod-1', 'prod-2'], 'Party Balloons');
    expect(result.count).toBe(2);
    expect(result.categoryName).toBe('Party Balloons');
    expect(result.productIds).toEqual(['prod-1', 'prod-2']);
  });

  it('bulkAssignCategory unassigns category when set to uncategorized', async () => {
    const { bulkAssignCategory } = await import('@/lib/catalog/product-service');
    const result = await bulkAssignCategory(['prod-1'], 'uncategorized');
    expect(result.categoryId).toBeNull();
  });
});
