import { describe, it, expect } from 'vitest';
import { matchJarvisIntent } from '../src/lib/ai/jarvis-chat-router';

describe('jarvis intent router', () => {
  it('routes sales questions to get_sales_summary', () => {
    expect(matchJarvisIntent('How are sales today?')?.toolName).toBe('get_sales_summary');
  });

  it('routes draft promotion requests', () => {
    expect(matchJarvisIntent('draft promotion Spring sale')?.toolName).toBe('draft_promotion');
  });

  it('routes draft purchase orders', () => {
    expect(matchJarvisIntent('draft po for supplier restock')?.toolName).toBe('draft_purchase_order');
  });

  it('routes dashboard brief', () => {
    expect(matchJarvisIntent('daily business brief')?.toolName).toBe('get_dashboard_summary');
  });

  it('routes inventory snapshot', () => {
    expect(matchJarvisIntent('inventory snapshot')?.toolName).toBe('get_inventory');
  });
});
