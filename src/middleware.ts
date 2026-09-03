import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_NAME, CUSTOMER_COOKIE_NAME, isStaffMiddlewareOptional } from '@/lib/auth/session-constants';
import { decodeSessionEdge } from '@/lib/auth/session-edge';
import { checkPathRateLimit, clientIpFromHeaders } from '@/lib/security/rate-limit';

/** Public marketing / storefront / auth / webhooks */
const PUBLIC_EXACT = new Set(['/', '/store', '/shop', '/shop/login', '/adminpoz', '/login']);
const PUBLIC_PREFIXES = [
  '/shop/',
  '/categories/',
  '/api/auth/',
  '/api/webhooks',
  '/api/whatsapp/webhook',
  '/api/health',
  '/api/seed',
  '/api/pos/catalog',
  '/api/pos/checkout', // storefront + POS; handler still authenticates
  '/api/storefront/public',
  '/api/storefront/search',
  '/api/config/flags',
  '/api/repairs/public',
  '/api/repairs/estimate',
  '/api/repairs/appointments',
  '/api/orders/track',
  '/api/storefront/abandon-cart',
  '/api/promotions/evaluate-cart', // storefront checkout
  '/api/promotions/validate',
  '/track/',
  '/api/cron/',
];

/** Crawlable storefront product detail pages (not staff /products admin) */
function isStorefrontProduct(pathname: string) {
  return /^\/products\/[^/]+$/.test(pathname);
}

/** Staff back-office surfaces (require verified staff cookie in production) */
const STAFF_PREFIXES = [
  '/app',
  '/dashboard',
  '/pos',
  '/shifts',
  '/whatsapp',
  '/creative',
  '/collections',
  '/quotations',
  '/damages',
  '/orders',
  '/reports',
  '/marketing',
  '/social',
  '/warranties',
  '/ai',
  '/inventory',
  '/purchasing',
  '/suppliers',
  '/customers',
  '/polim-potha',
  '/accounts',
  '/settings',
  '/setup',
  '/repairs',
  '/restaurant',
  '/hire-purchase',
  '/appointments',
  '/loyalty',
  '/returns',
  '/delivery',
  '/discounts',
  '/barcodes',
  '/approvals',
  '/ops',
  '/wholesale',
  '/settings/automation',
  '/store/builder',
  '/pos/trade-in',
  '/inventory/stock-take',
  '/inventory/transfer',
  '/reports/tax',
  '/serials',
];

function isPublic(pathname: string) {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (isStorefrontProduct(pathname)) return true;
  if (pathname.startsWith('/track/')) return true;
  if (/^\/api\/orders\/[^/]+\/invoice$/.test(pathname)) return true;
  if (pathname.startsWith('/serials/') && process.env.NODE_ENV !== 'production') return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

function isStaffSurface(pathname: string) {
  if (pathname === '/products' || pathname.startsWith('/products/import')) return true;
  return STAFF_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Dual auth:
 * - Storefront + shopper APIs: public (or customer cookie for /shop/account)
 * - Staff OS / staff APIs: HMAC-verified grabber_session in production
 * AUTH_OPTIONAL is ignored when NODE_ENV=production (see isStaffMiddlewareOptional).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(png|jpg|jpeg|svg|ico|css|js|map|webp)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    const ip = clientIpFromHeaders(req.headers);
    const limited = checkPathRateLimit(pathname, ip);
    if (!limited.ok) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', retryAfterSec: limited.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } },
      );
    }
  }

  if (isPublic(pathname) && pathname !== '/shop/account') {
    return NextResponse.next();
  }

  // Shopper account page
  if (pathname.startsWith('/shop/account')) {
    if (isStaffMiddlewareOptional()) {
      return NextResponse.next();
    }
    if (!req.cookies.get(CUSTOMER_COOKIE_NAME)?.value) {
      const url = req.nextUrl.clone();
      url.pathname = '/shop/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const optional = isStaffMiddlewareOptional();

  if (pathname.startsWith('/api/')) {
    if (optional || isPublic(pathname)) return NextResponse.next();
    const session = await decodeSessionEdge(req.cookies.get(COOKIE_NAME)?.value);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isStaffSurface(pathname)) {
    if (optional) return NextResponse.next();
    const session = await decodeSessionEdge(req.cookies.get(COOKIE_NAME)?.value);
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = '/adminpoz';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
