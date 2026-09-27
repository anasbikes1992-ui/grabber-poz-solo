import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    cpus: 1,
  },
  serverExternalPackages: ['better-sqlite3', 'node-thermal-printer', 'pdf-lib'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/**' },
      { protocol: 'https', hostname: '**.supabase.in', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: '**.grabberpoz.com', pathname: '/**' },
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "frame-ancestors 'self'",
          "object-src 'none'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data: https:",
          "style-src 'self' 'unsafe-inline' https:",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
          "connect-src 'self' https: wss:",
          "worker-src 'self' blob:",
          "manifest-src 'self'",
        ].join('; '),
      },
    ];

    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' });
    }

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

const sentryEnabled = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG || undefined,
      project: process.env.SENTRY_PROJECT || undefined,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : nextConfig;
