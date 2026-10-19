import Shell from '@/components/storefront/Shell';
import RichText from '@/components/storefront/RichText';
import { storefront, type Page as SitePage } from '@/services/storefront.server';
import { redirectLegacyPath } from '@/lib/legacy-route.server';
import { pageMetadata } from '@/lib/storefront-seo';
import { notFound } from 'next/navigation';
// ISR: rendered on first request, then served from the page cache and
// regenerated in the background (backend saves purge it on demand).
export const revalidate = 300;
// No build-time prerendering (the build has no backend); see [locale]/layout.
export function generateStaticParams() { return []; }
type Props = { params: Promise<{ articlePath: string[] }> };
async function resolve(parts: string[]) {
 const path = '/' + parts.join('/');
 await redirectLegacyPath(path);
 if (parts.length === 1) { const page = await storefront<SitePage>(`pages/${encodeURIComponent(parts[0])}`); if (page) return page; }
 notFound();
}
export async function generateMetadata({ params }: Props) { const { articlePath } = await params; const p = await resolve(articlePath); return pageMetadata('/' + articlePath.join('/'), p.meta_title || p.title, p.meta_description || p.summary, p.meta_keywords); }
export default async function Page({ params }: Props) { const { articlePath } = await params; const p = await resolve(articlePath); return <Shell><article className="legacy-article"><h1>{p.title}</h1><RichText content={p.content} /></article></Shell>; }
