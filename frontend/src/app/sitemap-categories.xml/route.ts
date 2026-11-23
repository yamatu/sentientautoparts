import { storefront, type Navigation } from '@/services/storefront.server';
import { isCategoryIndexable } from '@/lib/category-seo';
import { sitemap } from '@/lib/storefront-sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
  const nav = await storefront<Navigation>('navigation');
  const indexable = (nav?.categories || []).filter((c) => isCategoryIndexable(c));
  return sitemap(indexable.map((c) => '/categories/' + c.slug));
}
