import { describe, it, expect } from 'vitest';
import { DEFAULT_STOREFRONT } from '../src/lib/config/storefront-config';
import { interpolateTemplate } from '../src/lib/automation/engine';

describe('storefront cms config', () => {
  it('ships default hero and announcement blocks', () => {
    expect(DEFAULT_STOREFRONT.blocks.some((b) => b.type === 'HERO')).toBe(true);
    expect(DEFAULT_STOREFRONT.blocks.some((b) => b.type === 'ANNOUNCEMENT')).toBe(true);
    expect(DEFAULT_STOREFRONT.theme.primaryColor).toMatch(/^#/);
  });
});

describe('automation engine helpers', () => {
  it('interpolates template variables', () => {
    const text = interpolateTemplate('Order {{orderNumber}} for {{customerName}}', {
      orderNumber: 'ORD-001',
      customerName: 'Sam',
    });
    expect(text).toBe('Order ORD-001 for Sam');
  });
});
