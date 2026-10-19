import { storefront, productPath, type ProductList } from '@/services/storefront.server';
import { sitemap, assertFullSitemapPage, PRODUCT_SITEMAP_PAGE_SIZE } from '@/lib/storefront-sitemap';
export const dynamic = 'force-dynamic';
export async function GET(_req: Request, context: { params: Promise<{ page: string }> }) {
 const { page } = await context.params; const n = Number(page); if (!Number.isSafeInteger(n) || n < 1) return new Response('Not found', { status: 404 });
 const data = await storefront<ProductList>(`products?page=${n}&page_size=${PRODUCT_SITEMAP_PAGE_SIZE}`);
 if (!data?.products?.length) return new Response('Not found', { status: 404 });
 assertFullSitemapPage(PRODUCT_SITEMAP_PAGE_SIZE, data.page_size);
 return sitemap(data.products.map(productPath));
}
