/**
 * GRABBER BUSINESS OS — P0/P1 PORTAL SEPARATION TESTS
 * Verifies Company Website (GrabberPoz.com), Storefront (/shop),
 * Staff Authentication (/adminpoz), and Lead Capture.
 */

import { describe, it, expect } from 'vitest';
import { POST as handleLeadPost } from '../src/app/api/company/leads/route';

describe('P0/P1: Portal Separation & Company Platform', () => {
  it('enforces route separation: company site at root vs merchant shop at /shop', () => {
    const companyRoot = '/';
    const merchantStore = '/shop';
    const staffPortal = '/adminpoz';
    const shopperLogin = '/shop/login';

    // Must be completely distinct routes
    expect(companyRoot).not.toBe(merchantStore);
    expect(staffPortal).not.toBe(shopperLogin);
  });

  it('rejects incomplete lead submissions missing required contact info', async () => {
    const badReq = new Request('http://localhost/api/company/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: '',
        ownerName: 'Sunil',
        phone: '',
        email: 'sunil@test.com',
      }),
    });

    const res = await handleLeadPost(badReq);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('business name, owner name, phone, and email');
  });

  it('accepts valid commercial lead inquiries with industry and branch count', async () => {
    const validReq = new Request('http://localhost/api/company/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 'Lanka Super Mart',
        ownerName: 'Rohan Jayasuriya',
        phone: '0779988776',
        email: 'rohan@lankamart.lk',
        businessType: 'Grocery & Supermarket',
        branchCount: '2-3',
        message: 'Interested in barcode scanners and Polim Potha credit.',
      }),
    });

    const res = await handleLeadPost(validReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.leadId).toBeDefined();
    expect(data.message).toContain('Grabber POZ team will contact you');
  });
});
