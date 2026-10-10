import { storefront, type Article } from '@/services/storefront.server';
import { sitemap } from '@/lib/storefront-sitemap';
export const dynamic = 'force-dynamic';
interface ArticlesResponse { articles: Article[]; total_pages: number; }
export async function GET() {
 const paths: string[] = [];
 let page = 1;
 let totalPages = 1;
 do {
  const data = await storefront<ArticlesResponse>(`articles?page=${page}&page_size=100`);
  if (!data) break;
  paths.push(...(data.articles || []).map(a => '/news/' + a.slug));
  totalPages = data.total_pages || 1;
  page += 1;
 } while (page <= totalPages && page <= 50);
 return sitemap(paths);
}
