import { sitemap } from '@/lib/storefront-sitemap';
export const dynamic = 'force-dynamic';
// News/blog records share canonical /news/:slug URLs in this storefront.
export function GET() { return sitemap([]); }
