import { describe, expect, it } from 'vitest';
import {
  buildCompanyLeadCustomerMessage,
  buildCompanyLeadOwnerAlert,
} from '@/lib/company/whatsapp-automation';

const lead = {
  id: 'lead_1',
  businessName: 'Stones and Jewels',
  ownerName: 'Anaz',
  phone: '0771350035',
  email: 'owner@example.lk',
  businessType: 'Jewelry & Watches',
  branchCount: '1',
  message: 'Need full jewelry and watches setup.',
};

describe('company WhatsApp sales automation', () => {
  it('builds owner alert with inquiry details', () => {
    const text = buildCompanyLeadOwnerAlert(lead);
    expect(text).toContain('New Grabber Business OS inquiry');
    expect(text).toContain('Stones and Jewels');
    expect(text).toContain('Jewelry & Watches');
    expect(text).toContain('0771350035');
  });

  it('builds new inquiry reply with demo URL', () => {
    const text = buildCompanyLeadCustomerMessage(lead, 'NEW', 'https://demo.grabberpoz.com');
    expect(text).toContain('Grabber Business OS Pro');
    expect(text).toContain('https://demo.grabberpoz.com');
    expect(text).toContain('onboarding scope');
  });

  it('keeps proposal copy aligned to one Pro package', () => {
    const text = buildCompanyLeadCustomerMessage(lead, 'PROPOSAL_SENT', 'https://demo.grabberpoz.com');
    expect(text).toContain('one full Pro package');
    expect(text).toContain('implementation changes by vertical');
  });

  it('describes won-client isolated onboarding', () => {
    const text = buildCompanyLeadCustomerMessage(lead, 'WON', 'https://demo.grabberpoz.com');
    expect(text).toContain('isolated app');
    expect(text).toContain('isolated database');
    expect(text).toContain('handover checklist');
  });
});
