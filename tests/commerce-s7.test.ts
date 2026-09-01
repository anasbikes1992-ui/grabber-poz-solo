import { describe, it, expect } from 'vitest';
import { formatJarvisReply } from '../src/lib/ai/jarvis-chat-router';
import { renderTemplate } from '../src/lib/whatsapp/templates';

describe('jarvis reply formatter', () => {
  it('formats dashboard summary', () => {
    const reply = formatJarvisReply({
      toolName: 'get_dashboard_summary',
      risk: 'READ',
      status: 'EXECUTED',
      data: { todayBillsCount: 5, todayRevenue: 12500, lowStockCount: 2 },
    });
    expect(reply).toContain('5 orders');
    expect(reply).toContain('12,500');
  });
});

describe('whatsapp template render', () => {
  it('interpolates variables', () => {
    const text = renderTemplate('Hi {{customerName}}, order {{orderNumber}}', {
      customerName: 'Sam',
      orderNumber: 'ORD-1',
    });
    expect(text).toBe('Hi Sam, order ORD-1');
  });
});
