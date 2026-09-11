import { describe, expect, it, afterEach } from 'vitest';
import { resolveLandingMode } from '@/lib/config/landing-mode';

describe('resolveLandingMode', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it('uses explicit LANDING_MODE=storefront', () => {
    process.env.LANDING_MODE = 'storefront';
    expect(resolveLandingMode('grabberpoz.com')).toBe('storefront');
  });

  it('uses explicit LANDING_MODE=company', () => {
    process.env.LANDING_MODE = 'company';
    expect(resolveLandingMode('shoppingstation.example.com')).toBe('company');
  });

  it('defaults company hosts to marketing', () => {
    delete process.env.LANDING_MODE;
    delete process.env.NEXT_PUBLIC_LANDING_MODE;
    expect(resolveLandingMode('grabberpoz.com')).toBe('company');
    expect(resolveLandingMode('www.grabberpoz.com')).toBe('company');
    expect(resolveLandingMode('grabber-poz-solo.vercel.app')).toBe('company');
  });

  it('defaults unknown client hosts to storefront', () => {
    delete process.env.LANDING_MODE;
    delete process.env.NEXT_PUBLIC_LANDING_MODE;
    expect(resolveLandingMode('shoppingstation.grabberpoz.com')).toBe('storefront');
    expect(resolveLandingMode('wowthings.lk')).toBe('storefront');
  });

  it('treats demo.grabberpoz.com as a merchant storefront, not the company site', () => {
    delete process.env.LANDING_MODE;
    delete process.env.NEXT_PUBLIC_LANDING_MODE;
    delete process.env.COMPANY_LANDING_HOSTS;
    delete process.env.NEXT_PUBLIC_COMPANY_LANDING_HOSTS;
    expect(resolveLandingMode('demo.grabberpoz.com')).toBe('storefront');
    expect(resolveLandingMode('demo.grabberpoz.com:443')).toBe('storefront');
    expect(resolveLandingMode('grabberpoz.com')).toBe('company');
    expect(resolveLandingMode('thepartystore.grabberpoz.com')).toBe('storefront');
  });
});
