import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
// Same global stylesheets the admin inherited from the former shared root layout.
import '../globals.css';
import '../legacy-theme.css';
import '../storefront.css';
import { getSiteUrl } from '@/lib/url';
import { getStorefrontSettings } from '@/services/storefront.server';
import AdminProviders from './AdminProviders';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Admin is its own root layout: public pages live under app/[locale] with a
// locale-aware, ISR-cacheable root layout that admin must not inherit.
// Admin stays request-rendered exactly as before the split.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  let brand = 'Admin';
  try {
    brand = (await getStorefrontSettings()).site.brand_name || brand;
  } catch {
    // The admin shell must still render when the storefront API is down.
  }
  return {
    metadataBase: new URL(getSiteUrl()),
    title: { default: brand, template: `%s | ${brand}` },
    icons: { icon: [{ url: '/favicon.ico', sizes: 'any' }], apple: '/apple-touch-icon.png' },
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  };
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head><meta name="theme-color" content="#1a51ff" /></head>
      <body><AdminProviders>{children}</AdminProviders></body>
    </html>
  );
}
