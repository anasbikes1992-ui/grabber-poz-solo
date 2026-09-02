import { describe, it, expect } from 'vitest';
import { renderCreativeMedia, hasCreativeMediaPipeline } from '../src/lib/creative/media-provider';
import { matchJarvisIntent } from '../src/lib/ai/jarvis-chat-router';
import { isActionableRecommendation } from '../src/lib/agents/approval-bridge';

describe('creative media provider', () => {
  it('uses product image when provided', async () => {
    const result = await renderCreativeMedia({
      visualPrompt: 'Premium linen shirt on marble pedestal',
      productImageUrl: 'https://cdn.example.com/shirt.jpg',
    });
    expect(result.outputUrl).toBe('https://cdn.example.com/shirt.jpg');
    expect(result.provider).toBe('PRODUCT_IMAGE');
  });

  it('falls back to dev placeholder without API keys', async () => {
    const prevFal = process.env.FAL_KEY;
    const prevRep = process.env.REPLICATE_API_TOKEN;
    delete process.env.FAL_KEY;
    delete process.env.REPLICATE_API_TOKEN;

    const result = await renderCreativeMedia({
      visualPrompt: 'Studio hero shot of sneakers',
      aspectRatio: '9:16',
    });

    process.env.FAL_KEY = prevFal;
    process.env.REPLICATE_API_TOKEN = prevRep;

    expect(result.provider).toBe('DEV_PLACEHOLDER');
    expect(result.outputUrl).toMatch(/^https:\/\//);
    expect(result.stub).toBe(true);
  });

  it('detects pipeline env keys', () => {
    expect(typeof hasCreativeMediaPipeline()).toBe('boolean');
  });
});

describe('Jarvis creative routing', () => {
  it('routes creative campaign drafts', () => {
    const intent = matchJarvisIntent('draft creative seasonal hero for shirts');
    expect(intent?.toolName).toBe('draft_creative_campaign');
    expect(intent?.args.title).toBeTruthy();
  });
});

describe('creative agent approval bridge', () => {
  it('flags project-tagged creative recommendations', () => {
    const rec =
      'Approve creative campaign [projectId=00000000-0000-4000-8000-000000000001] "Summer Sale" — publish to storefront.';
    expect(isActionableRecommendation(rec)).toBe(true);
    expect(rec).toMatch(/\[projectId=00000000-0000-4000-8000-000000000001\]/);
  });
});
