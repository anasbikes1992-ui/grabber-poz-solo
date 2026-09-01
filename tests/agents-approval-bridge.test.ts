import { describe, it, expect } from 'vitest';
import { isActionableRecommendation } from '../src/lib/agents/approval-bridge';

describe('agent approval bridge (AGT-04)', () => {
  it('flags actionable inventory recommendations', () => {
    expect(isActionableRecommendation('Draft PO line: Widget (2 on hand, reorder 5).')).toBe(true);
  });

  it('flags repair ticket follow-ups', () => {
    expect(isActionableRecommendation('Ticket JOB-123 (iPhone) — READY: contact Ali.')).toBe(true);
  });

  it('flags REPAIR_READY WhatsApp prompt', () => {
    expect(isActionableRecommendation('2 device(s) ready — trigger REPAIR_READY WhatsApp.')).toBe(true);
  });

  it('ignores generic marketing hints', () => {
    expect(isActionableRecommendation('Review weekend promo demand.')).toBe(false);
    expect(isActionableRecommendation('Promote /shop/repairs on storefront hero.')).toBe(false);
  });

  it('flags creative and promo approvals', () => {
    expect(isActionableRecommendation('Approve a creative campaign to refresh hero copy.')).toBe(true);
    expect(isActionableRecommendation('Run WELCOME500 on homepage announcement bar.')).toBe(true);
  });
});
