import { describe, it, expect } from 'vitest';
import { buildRepairEstimatePreview, formatTicketCode } from '../src/lib/repairs/pricing';
import { getRepairServiceBySlug, REPAIR_SERVICES } from '../src/lib/repairs/services';
import { REPAIR_STATUS_LABELS } from '../src/lib/repairs/status';
import { interpolateTemplate } from '../src/lib/automation/engine';

describe('repairs pricing', () => {
  it('formats ticket codes', () => {
    expect(formatTicketCode(482)).toMatch(/^REP-\d{4}-00482$/);
  });

  it('returns inspection required for charging service', () => {
    const est = buildRepairEstimatePreview({
      serviceSlug: 'charging-power',
      mode: 'DROP_OFF',
      brand: 'Samsung',
      model: 'A54',
    });
    expect(est.priceType).toBe('INSPECTION_REQUIRED');
    expect(est.diagnosticFeeLkr).toBeGreaterThan(0);
  });

  it('adds travel fee for home visit', () => {
    const est = buildRepairEstimatePreview({
      serviceSlug: 'battery-replacement',
      mode: 'HOME_VISIT',
      brand: 'Apple',
      model: 'iPhone 13',
    });
    expect(est.travelFeeLkr).toBe(2000);
  });
});

describe('repairs catalog', () => {
  it('has eight service categories', () => {
    expect(REPAIR_SERVICES.length).toBe(8);
  });

  it('resolves slug lookup', () => {
    expect(getRepairServiceBySlug('screen-glass-repair')?.name).toContain('Screen');
  });
});

describe('repair automation templates', () => {
  it('interpolates repair ticket variables', () => {
    const text = interpolateTemplate(
      'Ticket {{ticketCode}} for {{deviceModel}} — {{customerName}}',
      { ticketCode: 'REP-2026-00001', deviceModel: 'Apple iPhone 13', customerName: 'Sam' },
    );
    expect(text).toContain('REP-2026-00001');
    expect(text).toContain('Sam');
  });
});

describe('repair status labels', () => {
  it('maps INTAKE for customer timeline', () => {
    expect(REPAIR_STATUS_LABELS.INTAKE).toBe('Request received');
  });
});
