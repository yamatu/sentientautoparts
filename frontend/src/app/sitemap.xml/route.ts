import { storefront, type ProductList } from '@/services/storefront.server';
import { getSiteUrl } from '@/lib/url';
import { escapeXML, PRODUCT_SITEMAP_PAGE_SIZE } from '@/lib/storefront-sitemap';
export const dynamic = 'force-dynamic';
export async function GET() {
 const data = await storefront<ProductList>('products?page_size=1');
 const paths = ['/sitemap-static.xml', '/sitemap-categories.xml', '/sitemap-news.xml', ...Array.from({ length: Math.ceil((data?.total || 0) / PRODUCT_SITEMAP_PAGE_SIZE) }, (_, i) => `/sitemap-products/${i + 1}.xml`)];
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p => `<sitemap><loc>${escapeXML(getSiteUrl() + p)}</loc></sitemap>`).join('')}</sitemapindex>`, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=60' } });
}
