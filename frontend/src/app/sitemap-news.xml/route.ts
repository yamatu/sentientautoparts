import { storefront, type Article } from '@/services/storefront.server';
import { sitemap } from '@/lib/storefront-sitemap';
export const dynamic = 'force-dynamic';
export async function GET() { const rows = await storefront<Article[]>('articles'); return sitemap((rows || []).map(a => '/news/' + a.slug)); }
