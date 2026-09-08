import { describe, it, expect } from 'vitest';
import { KeywordIntelligenceEngine } from '@/lib/seo/keyword-intelligence';
import { SeoOpportunityScorer } from '@/lib/seo/opportunity-scorer';
import { SeoContentFactory } from '@/lib/seo/content-factory';
import { LocalSeoEngine } from '@/lib/seo/local-seo';

describe('SEO & Growth Intelligence Engine', () => {
  it('classifies keyword intents accurately', () => {
    expect(KeywordIntelligenceEngine.classifyIntent('buy iphone 15 online Sri Lanka')).toBe('LOCAL');
    expect(KeywordIntelligenceEngine.classifyIntent('order fresh milk delivery')).toBe('TRANSACTIONAL');
    expect(KeywordIntelligenceEngine.classifyIntent('best price power drill supplier')).toBe('COMMERCIAL');
    expect(KeywordIntelligenceEngine.classifyIntent('how to replace motorcycle battery')).toBe('INFORMATIONAL');
  });

  it('calculates normalized opportunity scores according to the master formula', () => {
    const opp = SeoOpportunityScorer.calculateScore({
      keyword: 'buy apple watch Colombo',
      searchDemandScore: 80,       // 80 * 0.25 = 20
      commercialIntentScore: 90,   // 90 * 0.25 = 22.5
      rankingGapScore: 70,         // 70 * 0.20 = 14
      competitionEaseScore: 60,    // 60 * 0.15 = 9
      conversionPotentialScore: 85,// 85 * 0.15 = 12.75
    });

    // 20 + 22.5 + 14 + 9 + 12.75 = 78.25 => 78
    expect(opp.totalScore).toBe(78);
    expect(opp.priority).toBe('HIGH');
    expect(opp.explanation).toMatch(/Strong commercial buying intent/);
  });

  it('generates rich product SEO bundles with valid JSON-LD schemas', () => {
    const bundle = SeoContentFactory.generateProductBundle({
      name: 'Wireless Bluetooth Earbuds Pro',
      price: 6500,
      currency: 'LKR',
      brand: 'GrabberTech',
      sku: 'SKU-EARBUDS-01',
      availability: 'InStock',
    });

    expect(bundle.seoTitle).toContain('Best Price in Sri Lanka');
    expect(bundle.metaDescription).toContain('LKR 6,500');
    expect(bundle.faqs.length).toBeGreaterThanOrEqual(3);
    expect(bundle.structuredDataJsonLd['@type']).toBe('Product');
    expect(bundle.structuredDataJsonLd.offers).toBeDefined();
  });

  it('generates multi-location branch landing pages with LocalBusiness schemas', () => {
    const page = LocalSeoEngine.buildBranchLandingPage({
      id: 'branch-colombo-01',
      name: 'Main Flagship Store',
      city: 'Colombo',
      address: '123 Galle Road, Kollupitiya',
      phone: '+94 11 234 5678',
      storeName: 'Grabber Superstore',
    });

    expect(page.slug).toBe('/locations/colombo-main-flagship-store');
    expect(page.metaTitle).toContain('Colombo Branch');
    expect(page.schema['@type']).toBe('LocalBusiness');
  });
});
