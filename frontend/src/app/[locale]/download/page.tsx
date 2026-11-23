import Shell from '@/components/storefront/Shell';
import CatalogDownload from '@/components/storefront/CatalogDownload';
import { breadcrumbSchema, DISPLAY_SITE_NAME, jsonLD, pageMetadata } from '@/lib/storefront-seo';
import { getStorefrontSettings } from '@/services/storefront.server';
import { getSiteUrl } from '@/lib/url';
import { notFound } from 'next/navigation';

// ISR: rendered on first request, then served from the page cache and
// regenerated in the background (backend saves purge it on demand).
export const revalidate = 300;

export async function generateMetadata() {
  const { site } = await getStorefrontSettings();
  if (!site.catalog_enabled) notFound();
  return pageMetadata('/download', site.catalog_title || 'Download Product Catalog', site.catalog_description);
}

export default async function Page() {
  const { site } = await getStorefrontSettings();
  if (!site.catalog_enabled || !site.catalog_url) notFound();
  const siteUrl = getSiteUrl();
  const title = site.catalog_title || 'Product catalog';
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${title} — ${DISPLAY_SITE_NAME}`,
    description: site.catalog_description,
    url: `${siteUrl}/download`,
    isPartOf: { '@id': `${siteUrl}/#website` },
  };

  return (
    <Shell inquiry={false}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD(webPageSchema) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLD(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: title, path: '/download' },
            ]),
          ),
        }}
      />
      <div className="legacy-article legacy-contact">
        <h1>{title}</h1>
        <CatalogDownload config={site} />
      </div>
    </Shell>
  );
}
