import { storefront, getStorefrontSettings, type Navigation } from '@/services/storefront.server';
import { DUPLICATE_LEGACY_PAGE_REDIRECTS } from '@/lib/category-seo';
import { sitemap } from '@/lib/storefront-sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [nav, { site }] = await Promise.all([storefront<Navigation>('navigation'), getStorefrontSettings()]);
  const sitePages = (nav?.pages || [])
    .filter((p) => !DUPLICATE_LEGACY_PAGE_REDIRECTS[p.page_key])
    .map((p) => '/' + p.page_key);
  return sitemap([
    '/',
    '/products',
    '/about',
    '/news',
    '/contact_us',
    ...(site.catalog_enabled ? ['/download'] : []),
    ...(site.distributor_enabled ? ['/dujia'] : []),
    ...sitePages,
  ]);
}
