import { storefront, type Navigation } from '@/services/storefront.server';
import { sitemap } from '@/lib/storefront-sitemap';
export const dynamic = 'force-dynamic';
export async function GET() { const nav = await storefront<Navigation>('navigation'); return sitemap((nav?.categories || []).map(c => '/categories/' + c.slug)); }
