import 'server-only';
import { cache } from 'react';
import { productPathID } from '@/lib/product-path';
import type { AutomotiveFields } from '@/types/automotive';
import type { StorefrontSettings } from '@/types/storefront';
import type { SocialMediaSettings } from '@/types';

export interface Category { id: number; name: string; slug: string; description: string; image_url: string; parent_id?: number; product_count?: number; }
export interface Page { id: number; page_key: string; title: string; summary: string; content: string; meta_title: string; meta_description: string; meta_keywords: string; updated_at: string; }
export interface Article extends Omit<Page, 'page_key'> { slug: string; featured_image: string; }
export interface Product extends Partial<AutomotiveFields> { id: number; sku: string; name: string; model: string; part_number: string; brand: string; description: string; short_description: string; price: number; category: Category; meta_title: string; meta_description: string; meta_keywords: string; image_urls: string | string[]; images: { url: string; alt_text: string }[]; attributes: { attribute_name: string; attribute_value: string }[]; updated_at: string; }
export interface ProductList { products: Product[]; category: Category | null; page: number; page_size?: number; total: number; total_pages: number; }
export interface Navigation { categories: Category[]; pages: Page[]; makes: string[]; part_types: string[]; }
export interface HomeBlock { id?: number; section_key: string; title: string; subtitle: string; description: string; image_url: string; button_url: string; button_text: string; data?: Record<string, unknown> | null; sort_order: number; is_active: boolean; }
export interface HomeData { banners: { id: number; title: string; image_url: string; link_url: string; description: string }[]; blocks: HomeBlock[]; }
export interface PublicSiteConfig { site: StorefrontSettings; social: SocialMediaSettings; }
export interface B2BHome { sections: HomeBlock[]; banners: HomeData['banners']; products: Product[]; articles: Article[]; }
export const getStorefrontSettings = cache(async (): Promise<PublicSiteConfig> => {
 const data=await storefront<PublicSiteConfig>('settings');
 if(!data) throw new StorefrontUnavailable('Site settings are unavailable.');
 return data;
});
// Header, footer and catalogue sidebar need it on every page: a missing
// navigation must never be rendered (and cached) as an empty catalogue.
export const getNavigation = cache(async (): Promise<Navigation> => {
 const data=await storefront<Navigation>('navigation');
 if(!data) throw new StorefrontUnavailable('Catalogue navigation is unavailable.');
 return data;
});
export const getB2BHome = cache(async (): Promise<B2BHome> => {
 const data=await storefront<B2BHome>('b2b-home');
 if(!data) throw new StorefrontUnavailable('Homepage settings are unavailable.');
 return data;
});
export interface CatalogFilters { q?: string; make?: string; part_type?: string; year?: string; page?: number; }

export class StorefrontUnavailable extends Error {}

// Storefront reads go through Next's Data Cache so public pages can be served
// from the ISR cache. The backend purges these tags on save (see
// backend/services/revalidate.go). A cached page also records the tags of the
// fetches it rendered, so revalidating a tag refreshes every page using it.
export const STOREFRONT_REVALIDATE_SECONDS = 300;
export function storefrontCacheTags(path: string): string[] {
  const tags = ['public-api', 'storefront'];
  switch (path.split(/[/?]/)[0]) {
    case 'settings': tags.push('storefront-settings', 'social-links'); break;
    case 'home': case 'b2b-home': tags.push('homepage-content', 'all-products', 'news'); break;
    case 'navigation': tags.push('all-products', 'categories', 'site-pages'); break;
    case 'products': tags.push('all-products'); break;
    case 'articles': tags.push('news'); break;
    case 'pages': tags.push('site-pages'); break;
    case 'resolve': tags.push('legacy-routes'); break;
  }
  return tags;
}

// Only a real 404 resolves to null (callers turn that into notFound()). Network
// errors, timeouts and 5xx throw, so ISR keeps serving the last good page and
// never caches an outage as "not found" or as empty/default content.
export const storefront = cache(async <T>(path: string): Promise<T | null> => {
  const base = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '');
  let response: Response;
  try { response = await fetch(`${base}/api/v1/public/storefront/${path}`, { next: { revalidate: STOREFRONT_REVALIDATE_SECONDS, tags: storefrontCacheTags(path) }, signal: AbortSignal.timeout(15000) }); }
  catch { throw new StorefrontUnavailable('The catalogue service is temporarily unavailable.'); }
  if (response.status === 404) return null;
  if (!response.ok) throw new StorefrontUnavailable(`Catalogue request failed (${response.status}).`);
  const json = await response.json();
  if (!json.success) throw new StorefrontUnavailable('Invalid catalogue response.');
  return json.data as T;
});
export function productPath(p: Pick<Product, 'sku'>) { return `/products/${productPathID(p.sku)}`; }
export function imageURLs(p: Product): string[] {
  if (p.images?.length) return p.images.map(i => i.url);
  if (Array.isArray(p.image_urls)) return p.image_urls;
  try { const urls = JSON.parse(p.image_urls || '[]'); return Array.isArray(urls) ? urls.filter(v => typeof v === 'string') : []; } catch { return []; }
}
