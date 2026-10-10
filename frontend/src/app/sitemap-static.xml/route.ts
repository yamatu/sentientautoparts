import { storefront, getStorefrontSettings, type Navigation } from '@/services/storefront.server';
import { sitemap } from '@/lib/storefront-sitemap';
export const dynamic = 'force-dynamic';
export async function GET() { const [nav,{site}] = await Promise.all([storefront<Navigation>('navigation'),getStorefrontSettings()]); return sitemap(['/', '/products', '/about', '/news', '/contact_us', ...(site.catalog_enabled?['/download']:[]), ...(site.distributor_enabled?['/dujia']:[]), ...(nav?.pages || []).map(p => '/' + p.page_key)]); }
