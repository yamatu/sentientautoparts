import Shell from '@/components/storefront/Shell';
import RichText from '@/components/storefront/RichText';
import { storefront, type Page as SitePage } from '@/services/storefront.server';
import { redirectLegacyPath } from '@/lib/legacy-route.server';
import { DUPLICATE_LEGACY_PAGE_REDIRECTS } from '@/lib/category-seo';
import { breadcrumbSchema, jsonLD, pageMetadata, plainText } from '@/lib/storefront-seo';
import { getSiteUrl } from '@/lib/url';
import { notFound, permanentRedirect } from 'next/navigation';

// ISR: rendered on first request, then served from the page cache and
// regenerated in the background (backend saves purge it on demand).
export const revalidate = 300;
// No build-time prerendering (the build has no backend); see [locale]/layout.
export function generateStaticParams() { return []; }

type Props = { params: Promise<{ articlePath: string[] }> };

async function resolve(parts: string[]) {
  if (parts.length === 1 && DUPLICATE_LEGACY_PAGE_REDIRECTS[parts[0]]) {
    permanentRedirect(DUPLICATE_LEGACY_PAGE_REDIRECTS[parts[0]]);
  }
  const path = '/' + parts.join('/');
  await redirectLegacyPath(path);
  if (parts.length === 1) {
    const page = await storefront<SitePage>(`pages/${encodeURIComponent(parts[0])}`);
    if (page) return page;
  }
  notFound();
}

export async function generateMetadata({ params }: Props) {
  const { articlePath } = await params;
  const p = await resolve(articlePath);
  return pageMetadata('/' + articlePath.join('/'), p.meta_title || p.title, p.meta_description || p.summary, p.meta_keywords);
}

export default async function Page({ params }: Props) {
  const { articlePath } = await params;
  const p = await resolve(articlePath);
  const path = '/' + articlePath.join('/');
  const siteUrl = getSiteUrl();
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: p.title,
    description: plainText(p.meta_description || p.summary || p.content).slice(0, 260),
    url: `${siteUrl}${path}`,
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: { '@id': `${siteUrl}/#organization` },
  };

  return (
    <Shell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD(webPageSchema) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLD(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: p.title, path },
            ]),
          ),
        }}
      />
      <article className="legacy-article">
        <h1>{p.title}</h1>
        <RichText content={p.content} />
      </article>
    </Shell>
  );
}
