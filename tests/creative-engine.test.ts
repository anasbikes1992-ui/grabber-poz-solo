import { describe, it, expect } from 'vitest';
import { parseCreativeKind, titleWithKind, stripKindPrefix } from '../src/lib/creative/kinds';
import { generateUgcHooks, generateUgcScripts } from '../src/lib/creative/ugc-service';
import { hasGpuWorker } from '../src/lib/creative/gpu-worker-client';
import { PDF_TEMPLATES } from '../src/lib/creative/pdf-studio';

describe('creative kinds', () => {
  it('prefixes and parses project kinds', () => {
    const t = titleWithKind('UGC', 'Summer Sale');
    expect(t).toBe('[UGC] Summer Sale');
    expect(parseCreativeKind(t)).toBe('UGC');
    expect(stripKindPrefix(t)).toBe('Summer Sale');
  });
});

describe('UGC script generation', () => {
  it('generates hooks for conversion objective', () => {
    const hooks = generateUgcHooks('Linen Shirt', 'CONVERSION', 5);
    expect(hooks).toHaveLength(5);
    expect(hooks[0].text).toContain('Linen Shirt');
  });

  it('builds hook → problem → product → benefit → CTA scripts', () => {
    const hooks = generateUgcHooks('Widget', 'LAUNCH', 2);
    const scripts = generateUgcScripts('Widget', hooks, 'authentic', 'Quality you trust', 2);
    expect(scripts).toHaveLength(2);
    expect(scripts[0].scenes).toHaveLength(5);
    expect(scripts[0].scenes[0].beat).toBe('HOOK');
    expect(scripts[0].scenes[4].beat).toBe('CTA');
  });
});

describe('creative infrastructure', () => {
  it('lists PDF templates', () => {
    expect(PDF_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    expect(PDF_TEMPLATES.some((t) => t.id === 'PRICE_LIST')).toBe(true);
  });

  it('detects GPU worker env', () => {
    expect(typeof hasGpuWorker()).toBe('boolean');
  });
});
