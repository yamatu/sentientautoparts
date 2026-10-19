import { getSiteUrl } from './url';
export function escapeXML(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
// Products per sitemap shard. The storefront products endpoint serves up to
// 1000 per page; if it ever serves fewer than requested, every shard offset
// would shift and products would silently drop out of the sitemaps.
export const PRODUCT_SITEMAP_PAGE_SIZE = 1000;
export function assertFullSitemapPage(requested: number, served: number | undefined) {
 if (served !== requested) throw new Error(`Product sitemap page_size mismatch: requested ${requested}, got ${served}`);
}
export function sitemap(paths: string[]) {
 const base = getSiteUrl();
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(paths)].map(path => `<url><loc>${escapeXML(base + path)}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=60' } });
}
