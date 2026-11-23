import Shell from '@/components/storefront/Shell';
import RichText from '@/components/storefront/RichText';
import SafeImage from '@/components/storefront/SafeImage';
import { getStorefrontSettings, storefront, type Article } from '@/services/storefront.server';
import {
  breadcrumbSchema,
  DISPLAY_SITE_NAME,
  jsonLD,
  pageMetadata,
  plainText,
  toAbsoluteUrl,
} from '@/lib/storefront-seo';
import { getSiteUrl } from '@/lib/url';
import { notFound } from 'next/navigation';
import { redirectLegacyPath } from '@/lib/legacy-route.server';
import Link from 'next/link';
import { ArrowLeft, Calendar } from 'lucide-react';

// ISR: rendered on first request, then served from the page cache and
// regenerated in the background (backend saves purge it on demand).
export const revalidate = 300;
// No build-time prerendering (the build has no backend); see [locale]/layout.
export function generateStaticParams() { return []; }
type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const article = await storefront<Article>(`articles/${encodeURIComponent(slug)}`);
  if (!article) {
    await redirectLegacyPath(`/news/${slug}`);
    notFound();
  }
  return article;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const a = await load(slug);
  return pageMetadata(`/news/${slug}`, a.meta_title || a.title, a.meta_description || a.summary, a.meta_keywords, a.featured_image);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const [a, { site }] = await Promise.all([load(slug), getStorefrontSettings()]);
  const cleanTitle = a.title.trim();
  const date = a.updated_at ? new Date(a.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
  const siteUrl = getSiteUrl();
  const articleUrl = `${siteUrl}/news/${a.slug}`;
  const absoluteImg = a.featured_image ? toAbsoluteUrl(a.featured_image) : undefined;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: cleanTitle,
    description: plainText(a.meta_description || a.summary || a.content).slice(0, 260),
    datePublished: a.updated_at,
    dateModified: a.updated_at,
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    url: articleUrl,
    ...(absoluteImg ? { image: [absoluteImg] } : {}),
    author: {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: site.company_name || DISPLAY_SITE_NAME,
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: site.company_name || DISPLAY_SITE_NAME,
      ...(site.logo_url ? { logo: { '@type': 'ImageObject', url: toAbsoluteUrl(site.logo_url) } } : {}),
    },
  };

  return (
    <Shell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD(articleSchema) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLD(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'News & Insights', path: '/news' },
              { name: cleanTitle, path: `/news/${a.slug}` },
            ]),
          ),
        }}
      />
      <div className="news-article-wrap">
        <div className="sap-container">
          <nav className="sap-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">›</span>
            <Link href="/news">News &amp; Insights</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{cleanTitle}</span>
          </nav>
        </div>

        <div className="news-article-hero">
          <div className="sap-container news-article-header">
            {date && (
              <div className="news-article-meta">
                <Calendar size={14} aria-hidden="true" />
                <time dateTime={a.updated_at}>{date}</time>
              </div>
            )}
            <h1>{cleanTitle}</h1>
            {a.summary && <p className="news-article-summary">{a.summary}</p>}
          </div>
        </div>

        {a.featured_image && (
          <div className="sap-container news-article-cover">
            <SafeImage src={a.featured_image} alt={cleanTitle} fetchPriority="high" />
          </div>
        )}

        <div className="sap-container news-article-body">
          <div className="news-article-content legacy-rich">
            <RichText content={a.content} />
          </div>
          <aside className="news-article-sidebar">
            <Link href="/news" className="news-back-link">
              <ArrowLeft size={15} aria-hidden="true" /> Back to all articles
            </Link>
            <div className="news-sidebar-cta">
              <p>Looking for parts or have a technical question?</p>
              <Link href="/contact_us" className="sap-button">
                Contact our team
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </Shell>
  );
}
