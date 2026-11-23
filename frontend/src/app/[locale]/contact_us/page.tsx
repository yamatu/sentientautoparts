import Shell from '@/components/storefront/Shell';
import ContactForm from '@/components/storefront/ContactForm';
import CompanyContact from '@/components/storefront/CompanyContact';
import SocialLinks from '@/components/storefront/SocialLinks';
import { getStorefrontSettings } from '@/services/storefront.server';
import { breadcrumbSchema, DISPLAY_SITE_NAME, jsonLD, pageMetadata } from '@/lib/storefront-seo';
import { getSiteUrl } from '@/lib/url';

// ISR: rendered on first request, then served from the page cache and
// regenerated in the background (backend saves purge it on demand).
export const revalidate = 300;

export async function generateMetadata() {
  const { site } = await getStorefrontSettings();
  return pageMetadata('/contact_us', 'Contact Us', site.inquiry_intro);
}

export default async function Page() {
  const { site, social } = await getStorefrontSettings();
  const siteUrl = getSiteUrl();
  const contactSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: `Contact ${DISPLAY_SITE_NAME}`,
    description: site.inquiry_intro,
    url: `${siteUrl}/contact_us`,
    mainEntity: { '@id': `${siteUrl}/#organization` },
    isPartOf: { '@id': `${siteUrl}/#website` },
  };

  return (
    <Shell inquiry={false}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD(contactSchema) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLD(
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Contact Us', path: '/contact_us' },
            ]),
          ),
        }}
      />
      <div className="legacy-article legacy-contact">
        <h1>Contact us</h1>
        <div className="sap-contact-directory">
          <CompanyContact site={site} />
          <SocialLinks settings={social} location="contact" />
        </div>
        <ContactForm config={site} />
      </div>
    </Shell>
  );
}
