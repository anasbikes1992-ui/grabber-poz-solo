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

  it('routes inventory queries correctly', () => {
    expect(matchJarvisIntent('inventory snapshot')?.toolName).toBe('get_inventory');
    expect(matchJarvisIntent('inventory')?.toolName).toBe('get_inventory');
    expect(matchJarvisIntent('whats my stock')?.toolName).toBe('get_inventory');
    expect(matchJarvisIntent('stock on hand')?.toolName).toBe('get_inventory');
  });

  it('routes low stock questions to get_low_stock', () => {
    expect(matchJarvisIntent('whats low in my stocks')?.toolName).toBe('get_low_stock');
    expect(matchJarvisIntent('check low stock')?.toolName).toBe('get_low_stock');
    expect(matchJarvisIntent('reorder alerts')?.toolName).toBe('get_low_stock');
  });

  it('routes order questions to get_pending_orders', () => {
    expect(matchJarvisIntent('whats the orders')?.toolName).toBe('get_pending_orders');
    expect(matchJarvisIntent('orders')?.toolName).toBe('get_pending_orders');
    expect(matchJarvisIntent('pending orders')?.toolName).toBe('get_pending_orders');
    expect(matchJarvisIntent('whats pending')?.toolName).toBe('get_pending_orders');
    expect(matchJarvisIntent('what is pending')?.toolName).toBe('get_pending_orders');
  });

  it('routes total value of goods and inventory valuation questions', () => {
    expect(matchJarvisIntent('total value of goods')?.toolName).toBe('get_inventory_value');
    expect(matchJarvisIntent('what is the value of stock')?.toolName).toBe('get_inventory_value');
    expect(matchJarvisIntent('inventory worth')?.toolName).toBe('get_inventory_value');
  });

  it('routes top products questions', () => {
    expect(matchJarvisIntent('what are top products')?.toolName).toBe('get_top_products');
    expect(matchJarvisIntent('best sellers')?.toolName).toBe('get_top_products');
    expect(matchJarvisIntent('best sellers auto products')?.toolName).toBe('get_top_products');
  });
});
