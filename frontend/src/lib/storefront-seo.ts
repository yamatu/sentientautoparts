import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/url';
import { getStorefrontSettings } from '@/services/storefront.server';
import sanitizeHtml from 'sanitize-html';
export const plainText = (s = '') => sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
export async function pageMetadata(path: string, title: string, description = '', keywords = '', image?: string): Promise<Metadata> {
  const {site}=await getStorefrontSettings();
  const SITE_NAME=site.brand_name;
  const canonical = `${getSiteUrl()}${path === '/' ? '' : path}`;
  const desc = plainText(description).slice(0, 180);
  return { title: title || SITE_NAME, description: desc, keywords: keywords || undefined, alternates: { canonical }, openGraph: { title: `${title} | ${SITE_NAME}`, description: desc, url: canonical, type: 'website', ...(image ? { images: [{ url: image }] } : {}) }, twitter: { card: 'summary_large_image', title, description: desc } };
}
export const jsonLD = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
