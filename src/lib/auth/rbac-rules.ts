/**
 * Authoritative Role-Based Access Control (RBAC) Rules for Grabber Business OS.
 * Used by Edge Middleware, Server Components, and Navigation Layouts.
 */

import type { SessionRole } from './session-edge';

/**
 * Route prefixes allowed for each role.
 * Any route not explicitly matched in a role's allowlist is denied.
 */
export const ROLE_ROUTE_PERMISSIONS: Record<SessionRole, string[]> = {
  OWNER: ['*'], // Root access to everything
  ADMIN: ['*'], // System admin access

  MANAGER: [
    '/app',
    '/pos',
    '/shifts',
    '/products',
    '/orders',
    '/returns',
    '/customers',
    '/discounts',
    '/inventory',
    '/purchasing',
    '/suppliers',
    '/damages',
    '/barcodes',
    '/reports',
    '/approvals',
    '/quotations',
    '/polim-potha',
    '/hire-purchase',
    '/grocery',
    '/restaurant',
    '/repairs',
    '/appointments',
    '/loyalty',
    '/warranties',
    '/wholesale',
    '/delivery',
    '/settings', // Access to general business settings
    '/settings/warehouses',
    '/settings/automation',
    '/store/builder',
    '/social',
    '/whatsapp',
    '/marketing',
    '/creative',
    '/ai',
  ],

  CASHIER: [
    '/pos',
    '/shifts',
    '/customers',
    '/orders',
    '/returns',
    '/barcodes',
    '/restaurant',
    '/repairs',
    '/appointments',
  ],

  WAREHOUSE: [
    '/inventory',
    '/products',
    '/purchasing',
    '/suppliers',
    '/damages',
    '/barcodes',
    '/grocery',
    '/wholesale',
    '/shifts',
    '/settings/warehouses',
  ],

  ACCOUNTANT: [
    '/reports',
    '/orders',
    '/polim-potha',
    '/hire-purchase',
    '/quotations',
    '/shifts',
    '/purchasing',
    '/suppliers',
    '/returns',
  ],

  MARKETING: [
    '/creative',
    '/social',
    '/whatsapp',
    '/store/builder',
    '/discounts',
    '/marketing',
    '/categories',
    '/collections',
    '/products',
  ],
};

/**
 * Specifically forbidden sub-routes even if parent prefix matches.
 * E.g., MANAGER cannot access hardware secrets, installation license, or staff salary/PIN management.
 */
export const ROLE_ROUTE_DENY_PATTERNS: Partial<Record<SessionRole, string[]>> = {
  MANAGER: [
    '/settings/secrets',
    '/settings/installation',
    '/settings/staff',
  ],
  CASHIER: [
    '/app',
    '/products',
    '/settings',
    '/reports',
    '/purchasing',
    '/inventory',
    '/store/builder',
    '/ai',
    '/social',
    '/creative',
    '/damages',
    '/polim-potha',
    '/hire-purchase',
    '/quotations',
    '/approvals',
  ],
  WAREHOUSE: [
    '/app',
    '/settings/secrets',
    '/settings/installation',
    '/settings/staff',
    '/settings/payments',
    '/reports',
    '/polim-potha',
    '/hire-purchase',
    '/creative',
  ],
  ACCOUNTANT: [
    '/app',
    '/settings/secrets',
    '/settings/installation',
    '/settings/staff',
    '/settings/payments',
    '/pos',
    '/creative',
    '/ai',
  ],
  MARKETING: [
    '/app',
    '/settings/secrets',
    '/settings/installation',
    '/settings/staff',
    '/settings/payments',
    '/pos',
    '/purchasing',
    '/inventory/transfer',
    '/polim-potha',
    '/hire-purchase',
    '/damages',
  ],
};

/**
 * Returns default landing workspace path for a given role.
 */
export function getDefaultRouteForRole(role: SessionRole): string {
  switch (role) {
    case 'CASHIER':
      return '/pos';
    case 'WAREHOUSE':
      return '/inventory';
    case 'ACCOUNTANT':
      return '/reports';
    case 'MARKETING':
      return '/creative';
    case 'MANAGER':
    case 'ADMIN':
    case 'OWNER':
    default:
      return '/app';
  }
}

/**
 * Checks if a given pathname is allowed for a user role.
 */
export function isRouteAllowedForRole(role: SessionRole, pathname: string): boolean {
  if (role === 'OWNER' || role === 'ADMIN') {
    return true;
  }

  // Check explicit deny list first
  const denyList = ROLE_ROUTE_DENY_PATTERNS[role];
  if (denyList) {
    for (const pattern of denyList) {
      if (pathname === pattern || pathname.startsWith(`${pattern}/`)) {
        return false;
      }
    }
  }

  // Check allow list
  const allowList = ROLE_ROUTE_PERMISSIONS[role];
  if (!allowList) return false;

  for (const pattern of allowList) {
    if (pattern === '*') return true;
    if (pathname === pattern || pathname.startsWith(`${pattern}/`)) {
      return true;
    }
  }

  return false;
}
