import Shell from '@/components/storefront/Shell';
import ContactForm from '@/components/storefront/ContactForm';
import { breadcrumbSchema, DISPLAY_SITE_NAME, jsonLD, pageMetadata } from '@/lib/storefront-seo';
import { getStorefrontSettings } from '@/services/storefront.server';
import { getSiteUrl } from '@/lib/url';
import { notFound } from 'next/navigation';

// ISR: rendered on first request, then served from the page cache and
// regenerated in the background (backend saves purge it on demand).
export const revalidate = 300;

export async function generateMetadata() {
  const { site } = await getStorefrontSettings();
  if (!site.distributor_enabled) notFound();
  return pageMetadata(
    '/dujia',
    'Become a Distributor',
    `Apply to distribute factory-direct automotive A/C compressors from ${DISPLAY_SITE_NAME}. 1,580+ OE-spec models, ISO9001 quality, worldwide wholesale supply.`,
  );
}

export default async function Page() {
  const { site } = await getStorefrontSettings();
  if (!site.distributor_enabled) notFound();
  const siteUrl = getSiteUrl();
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Become a Distributor — ${DISPLAY_SITE_NAME}`,
    description: `Wholesale distributor partnership inquiries for ${DISPLAY_SITE_NAME} automotive A/C compressors.`,
    url: `${siteUrl}/dujia`,
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
              { name: 'Become a Distributor', path: '/dujia' },
            ]),
          ),
        }}
      />
      <div className="legacy-article legacy-contact">
        <p className="sap-eyebrow">GROW YOUR PARTS BUSINESS</p>
        <h1>Become a distributor</h1>
        <p className="sap-muted">Tell us about your market, product requirements and expected quantities.</p>
        <br />
        <ContactForm product="Distributor application" type="distributor" config={site} />
      </div>
    </Shell>
  );
}
