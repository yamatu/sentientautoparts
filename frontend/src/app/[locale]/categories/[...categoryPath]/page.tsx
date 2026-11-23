import Catalog from '@/components/storefront/Catalog';
import { getNavigation, storefront, type ProductList } from '@/services/storefront.server';
import {
  getCategoryDisplayName,
  getCategoryMetaDescription,
  isCategoryIndexable,
} from '@/lib/category-seo';
import { pageMetadata } from '@/lib/storefront-seo';
import { notFound } from 'next/navigation';
import { redirectLegacyPath } from '@/lib/legacy-route.server';

// Reads searchParams (filters/pagination), so it stays request-rendered. Under
// the static [locale] layout, dropping this makes the page 500 at runtime with
// DYNAMIC_SERVER_USAGE. Its backend reads still use the Data Cache.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ categoryPath: string[] }>;
  searchParams: Promise<{ page?: string; q?: string; make?: string; year?: string; part_type?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props) {
  const { categoryPath } = await params;
  await redirectLegacyPath('/categories/' + categoryPath.join('/'));
  const slug = categoryPath.at(-1) || '';

  const [data, nav] = await Promise.all([
    storefront<ProductList>(`products?category=${encodeURIComponent(slug)}&page_size=1`),
    getNavigation(),
  ]);
  if (!data) notFound();

  const filters = await searchParams;
  const navCat = nav.categories.find((c) => c.slug === slug) || data.category;
  const parentCat = navCat?.parent_id
    ? nav.categories.find((c) => c.id === navCat.parent_id) || null
    : null;
  const displayName = getCategoryDisplayName(data.category || navCat, parentCat);
  const metaDesc = getCategoryMetaDescription(data.category || navCat, parentCat, data.total);
  const catImage =
    navCat?.image_url ||
    navCat?.menu_image_url ||
    navCat?.product_image ||
    data.category?.image_url ||
    undefined;

  const hasFilters = Object.values(filters).some(Boolean);
  const indexable = !hasFilters && isCategoryIndexable({ product_count: data.total });

  return {
    ...(await pageMetadata(
      `/categories/${slug}`,
      displayName,
      metaDesc,
      `${displayName}, automotive A/C parts, OE replacement, wholesale supplier`,
      catImage,
    )),
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { categoryPath } = await params;
  await redirectLegacyPath('/categories/' + categoryPath.join('/'));
  const filters = await searchParams;
  return <Catalog category={categoryPath.at(-1)} {...filters} page={Math.max(1, Number(filters.page) || 1)} />;
}
