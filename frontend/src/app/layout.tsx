import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './legacy-theme.css';
import './storefront.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
import { ReactQueryProvider } from '@/lib/react-query';
import { PublicI18nProvider } from '@/lib/i18n/PublicI18nProvider';
import { Toaster } from 'react-hot-toast';
import { getSiteUrl } from '@/lib/url';
import { getStorefrontSettings } from '@/services/storefront.server';
import TrackingCode, { type PublicTrackingConfig } from '@/components/analytics/TrackingCode';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const {site}=await getStorefrontSettings();
  return { metadataBase: new URL(getSiteUrl()), title: { default: site.brand_name, template: `%s | ${site.brand_name}` }, description: site.home_meta_description, robots: { index: true, follow: true }, verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined } };
}
async function tracking(): Promise<PublicTrackingConfig | null> {
  try {
    const base = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080';
    const r = await fetch(`${base}/api/v1/public/analytics/config`, { cache: 'no-store', signal: AbortSignal.timeout(2000) });
    if (!r.ok) return null;
    const data = await r.json(); return data.success ? data.data : null;
  } catch { return null; }
}
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={inter.variable}><head><TrackingCode config={await tracking()} /><link rel="icon" href="/favicon.ico" /><meta name="theme-color" content="#1a51ff" /></head><body><ReactQueryProvider><PublicI18nProvider initialLocale="en">{children}<Toaster position="top-right" /></PublicI18nProvider></ReactQueryProvider></body></html>;
}
