import { describe, it, expect } from 'vitest';
import { formatJarvisReply } from '../src/lib/ai/jarvis-chat-router';
import { renderTemplate, validateTemplate, extractTemplateVariables } from '../src/lib/whatsapp/templates';
import { JarvisToolRegistry } from '../src/lib/ai/jarvis-tools';

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

describe('jarvis draft tools', () => {
  it('routes DRAFT tools through approval queue', async () => {
    const registry = new JarvisToolRegistry();
    const result = await registry.invokeTool(
      'draft_purchase_order',
      { supplierId: 'sup_1', warehouseId: 'wh_1', items: [] },
      {
        userId: 'user_1',
        userName: 'Owner',
        role: 'OWNER',
        assignedBranchIds: [],
        assignedWarehouseIds: [],
      },
    );
    expect(result.status).toBe('CONFIRMATION_REQUIRED');
    expect(result.confirmationToken).toMatch(/^DRAFT_/);
    expect(result.data).toMatchObject({ status: 'DRAFT_CREATED' });
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

  it('extracts and validates declared variables', () => {
    expect(extractTemplateVariables('Hi {{name}} — {{code}}')).toEqual(['name', 'code']);
    const ok = validateTemplate({
      id: 't1',
      name: 'test',
      language: 'en',
      body: 'Hi {{name}}',
      variables: ['name'],
      active: true,
    });
    expect(ok.ok).toBe(true);

    const bad = validateTemplate({
      id: 't2',
      name: 'bad',
      language: 'en',
      body: 'Hi {{missing}}',
      variables: ['name'],
      active: true,
    });
    expect(bad.ok).toBe(false);
  });
});
