import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Inter } from 'next/font/google';
import '../globals.css';
import '../legacy-theme.css';
import '../storefront.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
import { PublicI18nProvider } from '@/lib/i18n/PublicI18nProvider';
import { getLocaleConfig, isPublicLocale, normalizePublicLocale } from '@/lib/i18n/config';
import { getPublicMessageOverrides } from '@/lib/i18n/messages';
import type { LocaleRouteParams } from '@/lib/i18n/server';
import { getSiteUrl } from '@/lib/url';
import { getStorefrontSettings } from '@/services/storefront.server';
import TrackingCode, { type PublicTrackingConfig } from '@/components/analytics/TrackingCode';

// Nothing is prerendered at build time (the Docker build has no backend);
// pages render on first request and are then served from the ISR cache.
// Unprefixed English URLs reach this segment as locale "en" through the
// afterFiles rewrites in next.config.ts.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata(): Promise<Metadata> {
  const {site}=await getStorefrontSettings();
  return { metadataBase: new URL(getSiteUrl()), title: { default: site.brand_name, template: `%s | ${site.brand_name}` }, description: site.home_meta_description, icons: { icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' }, { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' }], apple: '/apple-touch-icon.png' }, manifest: '/manifest.json', robots: { index: true, follow: true }, verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined } };
}
async function tracking(): Promise<PublicTrackingConfig | null> {
  try {
    const base = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080';
    // Cached with the page; the backend revalidates "analytics-config" on save.
    // `cache: 'no-store'` here would make every public page dynamic again.
    const r = await fetch(`${base}/api/v1/public/analytics/config`, { next: { revalidate: 300, tags: ['public-api', 'analytics-config'] }, signal: AbortSignal.timeout(2000) });
    if (!r.ok) return null;
    const data = await r.json(); return data.success ? data.data : null;
  } catch { return null; }
}
// The storefront components use neither React Query nor toasts, so the public
// tree no longer ships those providers (the admin layout has its own).
export default async function RootLayout({ children, params }: { children: React.ReactNode; params: LocaleRouteParams }) {
  const { locale: rawLocale } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = normalizePublicLocale(rawLocale);
  const { hreflang, dir } = getLocaleConfig(locale);
  return <html lang={hreflang} dir={dir} className={inter.variable}><head><TrackingCode config={await tracking()} /><meta name="theme-color" content="#1a51ff" /></head><body><PublicI18nProvider initialLocale={locale} messageOverrides={getPublicMessageOverrides(locale)}>{children}</PublicI18nProvider></body></html>;
}
