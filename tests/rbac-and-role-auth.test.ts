import { describe, it, expect } from 'vitest';
import { isRouteAllowedForRole, getDefaultRouteForRole } from '@/lib/auth/rbac-rules';
import type { SessionRole } from '@/lib/auth/session-edge';

describe('RBAC & Role-Based Access Control Matrix (AUD-SEC-01)', () => {
  it('allows OWNER and ADMIN unrestricted root access', () => {
    const roles: SessionRole[] = ['OWNER', 'ADMIN'];
    const sensitivePaths = [
      '/app',
      '/settings',
      '/settings/secrets',
      '/settings/installation',
      '/settings/staff',
      '/products',
      '/reports',
      '/pos',
      '/inventory/transfer',
      '/creative',
    ];

    for (const role of roles) {
      for (const path of sensitivePaths) {
        expect(isRouteAllowedForRole(role, path)).toBe(true);
      }
    }
  });

  it('restricts CASHIER role strictly to POS, shifts, customers, and counter operations', () => {
    // Allowed paths for Cashier
    const allowed = [
      '/pos',
      '/shifts',
      '/customers',
      '/orders',
      '/returns',
      '/barcodes',
      '/restaurant',
      '/repairs',
      '/appointments',
    ];
    for (const path of allowed) {
      expect(isRouteAllowedForRole('CASHIER', path)).toBe(true);
    }

    // Forbidden paths for Cashier (P0 perimeter check)
    const forbidden = [
      '/app',
      '/products',
      '/settings',
      '/settings/staff',
      '/settings/secrets',
      '/settings/installation',
      '/reports',
      '/reports/tax',
      '/purchasing',
      '/inventory',
      '/inventory/transfer',
      '/store/builder',
      '/ai',
      '/social',
      '/creative',
      '/damages',
      '/polim-potha',
      '/hire-purchase',
      '/quotations',
      '/approvals',
    ];
    for (const path of forbidden) {
      expect(isRouteAllowedForRole('CASHIER', path)).toBe(false);
    }
  });

  it('restricts WAREHOUSE lead to inventory, receiving, and damages', () => {
    const allowed = [
      '/inventory',
      '/products',
      '/purchasing',
      '/suppliers',
      '/damages',
      '/barcodes',
      '/grocery',
      '/wholesale',
      '/settings/warehouses',
    ];
    for (const path of allowed) {
      expect(isRouteAllowedForRole('WAREHOUSE', path)).toBe(true);
    }

    const forbidden = [
      '/app',
      '/settings/secrets',
      '/settings/staff',
      '/settings/payments',
      '/reports',
      '/polim-potha',
      '/hire-purchase',
      '/creative',
    ];
    for (const path of forbidden) {
      expect(isRouteAllowedForRole('WAREHOUSE', path)).toBe(false);
    }
  });

  it('restricts ACCOUNTANT to ledger, reports, orders, and finance', () => {
    const allowed = [
      '/reports',
      '/orders',
      '/polim-potha',
      '/hire-purchase',
      '/quotations',
      '/shifts',
      '/purchasing',
    ];
    for (const path of allowed) {
      expect(isRouteAllowedForRole('ACCOUNTANT', path)).toBe(true);
    }

    const forbidden = [
      '/app',
      '/settings/secrets',
      '/settings/installation',
      '/settings/staff',
      '/pos',
      '/creative',
      '/ai',
    ];
    for (const path of forbidden) {
      expect(isRouteAllowedForRole('ACCOUNTANT', path)).toBe(false);
    }
  });

  it('restricts MARKETING / CREATIVE producer to studio, socials, and storefront builder', () => {
    const allowed = [
      '/creative',
      '/social',
      '/whatsapp',
      '/store/builder',
      '/discounts',
      '/marketing',
      '/products',
    ];
    for (const path of allowed) {
      expect(isRouteAllowedForRole('MARKETING', path)).toBe(true);
    }

    const forbidden = [
      '/app',
      '/settings/secrets',
      '/settings/staff',
      '/pos',
      '/purchasing',
      '/inventory/transfer',
      '/polim-potha',
      '/hire-purchase',
      '/damages',
    ];
    for (const path of forbidden) {
      expect(isRouteAllowedForRole('MARKETING', path)).toBe(false);
    }
  });

  it('restricts MANAGER from root system credentials and license settings', () => {
    // Allowed general operations
    expect(isRouteAllowedForRole('MANAGER', '/app')).toBe(true);
    expect(isRouteAllowedForRole('MANAGER', '/products')).toBe(true);
    expect(isRouteAllowedForRole('MANAGER', '/settings')).toBe(true);
    expect(isRouteAllowedForRole('MANAGER', '/reports')).toBe(true);

    // Explicitly forbidden root settings
    expect(isRouteAllowedForRole('MANAGER', '/settings/secrets')).toBe(false);
    expect(isRouteAllowedForRole('MANAGER', '/settings/installation')).toBe(false);
    expect(isRouteAllowedForRole('MANAGER', '/settings/staff')).toBe(false);
  });

  it('resolves correct default landing workspace for each role', () => {
    expect(getDefaultRouteForRole('CASHIER')).toBe('/pos');
    expect(getDefaultRouteForRole('WAREHOUSE')).toBe('/inventory');
    expect(getDefaultRouteForRole('ACCOUNTANT')).toBe('/reports');
    expect(getDefaultRouteForRole('MARKETING')).toBe('/creative');
    expect(getDefaultRouteForRole('MANAGER')).toBe('/app');
    expect(getDefaultRouteForRole('OWNER')).toBe('/app');
    expect(getDefaultRouteForRole('ADMIN')).toBe('/app');
  });
});
