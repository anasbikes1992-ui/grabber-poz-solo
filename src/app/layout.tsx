import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { StorefrontAnalytics } from '@/components/storefront/storefront-analytics';
import { resolveMarketingPixels } from '@/lib/config/resolve-marketing';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Grabber — Store & Business OS',
  description:
    'Online storefront for shoppers + staff POS, inventory, Polim Potha, and vertical operations.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pixels = await resolveMarketingPixels();
  return (
    <html lang="en" className={plusJakartaSans.variable} suppressHydrationWarning>
      <body className="antialiased min-h-screen font-sans selection:bg-emerald-500 selection:text-zinc-950">
        <StorefrontAnalytics pixels={pixels} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
