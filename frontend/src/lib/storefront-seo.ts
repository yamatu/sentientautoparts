import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/url';
import { getStorefrontSettings } from '@/services/storefront.server';
import sanitizeHtml from 'sanitize-html';

export const DISPLAY_SITE_NAME = 'SENTIENT Auto Parts';
export const DEFAULT_OG_IMAGE_PATH = '/images/og-image.jpg';

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

function decodeBasicEntities(s: string): string {
  let prev = s;
  for (let i = 0; i < 2; i += 1) {
    const next = prev.replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/gi, (m) => HTML_ENTITIES[m.toLowerCase()] ?? m);
    if (next === prev) break;
    prev = next;
  }
  return prev;
}

export const plainText = (s = '') =>
  decodeBasicEntities(sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} }))
    .replace(/\s+/g, ' ')
    .trim();

export function toAbsoluteUrl(input?: string | null): string {
  const siteUrl = getSiteUrl();
  const value = String(input || '').trim();
  if (!value) return siteUrl;
  if (/^https?:\/\//i.test(value)) return value;
  return `${siteUrl}${value.startsWith('/') ? value : `/${value}`}`;
}

export function hasBrandSuffix(title: string, brandName?: string): boolean {
  const normalized = title.toLowerCase();
  if (normalized.includes('sentient')) return true;
  if (brandName && normalized.includes(brandName.toLowerCase())) return true;
  return false;
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  const base = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.path === '/' ? base : `${base}${item.path.startsWith('/') ? item.path : `/${item.path}`}`,
    })),
  };
}

export async function pageMetadata(
  path: string,
  title: string,
  description = '',
  keywords = '',
  image?: string,
): Promise<Metadata> {
  const { site } = await getStorefrontSettings();
  const siteBrand = DISPLAY_SITE_NAME;
  const canonical = `${getSiteUrl()}${path === '/' ? '' : path}`;
  const cleanTitle = plainText(title) || siteBrand;
  const alreadyBranded = hasBrandSuffix(cleanTitle, site.brand_name);
  const fullTitle = alreadyBranded ? cleanTitle : `${cleanTitle} | ${siteBrand}`;
  const desc = plainText(description).slice(0, 180);
  const ogImageUrl = toAbsoluteUrl(image || DEFAULT_OG_IMAGE_PATH);

  return {
    title: alreadyBranded ? { absolute: cleanTitle } : cleanTitle,
    description: desc || undefined,
    keywords: keywords || undefined,
    alternates: { canonical },
    openGraph: {
      siteName: siteBrand,
      title: fullTitle,
      description: desc || undefined,
      url: canonical,
      type: 'website',
      images: [{ url: ogImageUrl, alt: cleanTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: desc || undefined,
      images: [ogImageUrl],
    },
  };
}

export const jsonLD = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
