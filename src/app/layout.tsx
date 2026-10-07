import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Nunito_Sans, Plus_Jakarta_Sans, Rubik } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { StorefrontAnalytics } from '@/components/storefront/storefront-analytics';
import { resolveMarketingPixels } from '@/lib/config/resolve-marketing';
import { DEFAULT_OG_IMAGE, absoluteUrl, siteBaseUrl } from '@/lib/storefront/seo';

const baseUrl = siteBaseUrl();

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-rubik',
  display: 'swap',
});

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Grabber POZ | POS, stock and online store',
    template: '%s | Grabber POZ',
  },
  description:
    'Online storefront for shoppers + staff POS, inventory, Polim Potha, and vertical operations.',
  alternates: { canonical: baseUrl },
  openGraph: {
    title: 'Grabber POZ | POS, stock and online store',
    description: 'POS, stock, customer credit and an online store for Sri Lankan shops, in one system.',
    url: baseUrl,
    siteName: 'Grabber POZ',
    type: 'website',
    images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE, baseUrl), alt: 'Grabber POZ retail and commerce OS' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grabber POZ | POS, stock and online store',
    description: 'POS, stock, customer credit and an online store for Sri Lankan shops, in one system.',
    images: [absoluteUrl(DEFAULT_OG_IMAGE, baseUrl)],
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.svg',
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Grabber' },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pixels = await resolveMarketingPixels();
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${bricolage.variable} ${rubik.variable} ${nunitoSans.variable} dark`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname;var pub=p==='/'||p==='/store'||p==='/login'||p==='/adminpoz'||p==='/shop'||p.startsWith('/shop/')||p.startsWith('/categories/')||p.startsWith('/track')||p.startsWith('/collections')||/^\\/products\\/[^/]+$/.test(p);if(pub){document.documentElement.classList.remove('dark');return;}if(localStorage.getItem('grabber_staff_theme')==='light'){document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased min-h-screen font-sans selection:bg-emerald-500 selection:text-zinc-950 [font-family:var(--font-nunito),var(--font-plus-jakarta),system-ui,sans-serif]">
        <StorefrontAnalytics pixels={pixels} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
