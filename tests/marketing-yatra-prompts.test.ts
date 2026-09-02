import { describe, it, expect } from 'vitest';
import {
  MARKETING_YATRA_PROMPTS,
  buildGeminiVideoPrompt,
  listMarketingYatraPrompts,
} from '../src/lib/creative/marketing-yatra-prompts';

describe('Marketing Yatra Gemini prompt pack', () => {
  it('includes 60 slash commands across 6 categories', () => {
    expect(MARKETING_YATRA_PROMPTS.length).toBe(60);
    const categories = new Set(MARKETING_YATRA_PROMPTS.map((p) => p.category));
    expect(categories.size).toBe(6);
  });

  it('lists prompts by category', () => {
    expect(listMarketingYatraPrompts('studio_premium').length).toBe(10);
    expect(listMarketingYatraPrompts('sale_launch').some((p) => p.command === '/deal-drop')).toBe(true);
  });

  it('builds paste-ready Gemini command with product name', () => {
    const { geminiCommand, visualPrompt, prompt } = buildGeminiVideoPrompt({
      commandId: 'unbox-now',
      productName: 'Grabber Hoodie',
      stylingHints: 'natural light',
      brandVoice: 'Friendly premium retail',
    });
    expect(prompt.command).toBe('/unbox-now');
    expect(geminiCommand).toContain('/unbox-now');
    expect(geminiCommand).toContain('Grabber Hoodie');
    expect(visualPrompt).toContain('Grabber Hoodie');
    expect(visualPrompt).toContain('natural light');
  });
});
