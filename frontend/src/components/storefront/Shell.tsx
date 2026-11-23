import Link from 'next/link';
import type { ReactNode } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import { getNavigation, getStorefrontSettings, getB2BHome, type Category } from '@/services/storefront.server';
import { getSiteUrl } from '@/lib/url';
import { DISPLAY_SITE_NAME, jsonLD, toAbsoluteUrl } from '@/lib/storefront-seo';
import Header from './Header';
import Brand from './Brand';
import SocialLinks, { configuredSocialLinks } from './SocialLinks';
import CompanyContact from './CompanyContact';
import PublicButton from './PublicButton';
import RichText from './RichText';

// The header is a client component: hand it only the root categories and the
// one picture its Products menu renders, not every category record on every page.
function headerCategory({ id, name, slug, image_url, menu_image_url, product_image }: Category): Category {
  return { id, name, slug, description: '', image_url: '', menu_image_url: menu_image_url || image_url || product_image || '' };
}

export default async function Shell({ children, inquiry = true }: { children: ReactNode; inquiry?: boolean }) {
  const [nav, config, home] = await Promise.all([getNavigation(), getStorefrontSettings(), getB2BHome()]);
  const { site, social } = config;
  const cta = home.sections.find((s) => s.section_key === 'inquiry_section' && s.is_active);
  const whatsapp = configuredSocialLinks(social).find((s) => s.key === 'whatsapp_url');
  const sameAs = configuredSocialLinks(social)
    .filter((l) => l.key !== 'whatsapp_url')
    .map((l) => l.href);

  const siteUrl = getSiteUrl();
  const orgId = `${siteUrl}/#organization`;
  const siteId = `${siteUrl}/#website`;
  const logoUrl = site.logo_url ? toAbsoluteUrl(site.logo_url) : undefined;

  const globalGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: site.company_name || DISPLAY_SITE_NAME,
        alternateName: DISPLAY_SITE_NAME,
        url: siteUrl,
        description: site.home_meta_description || site.footer_intro || undefined,
        ...(logoUrl ? { logo: { '@type': 'ImageObject', url: logoUrl } } : {}),
        ...(sameAs.length ? { sameAs } : {}),
        ...(site.contact_email ? { email: site.contact_email } : {}),
        ...(site.contact_phone ? { telephone: site.contact_phone } : {}),
        ...(site.address
          ? {
              address: {
                '@type': 'PostalAddress',
                streetAddress: site.address,
                addressLocality: 'Guangzhou',
                addressRegion: 'Guangdong',
                addressCountry: 'CN',
              },
            }
          : {}),
        ...(site.contact_email || site.contact_phone
          ? {
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'sales',
                ...(site.contact_email ? { email: site.contact_email } : {}),
                ...(site.contact_phone ? { telephone: site.contact_phone } : {}),
                availableLanguage: ['English', 'Chinese'],
              },
            }
          : {}),
      },
      {
        '@type': 'WebSite',
        '@id': siteId,
        name: DISPLAY_SITE_NAME,
        url: siteUrl,
        publisher: { '@id': orgId },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteUrl}/products?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <div className="legacy-site automotive-site">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD(globalGraph) }} />
      <a className="sap-skip" href="#main-content">Skip to content</a>
      <Header categories={nav.categories.filter((c) => !c.parent_id).map(headerCategory)} config={config} />
      <main id="main-content">{children}</main>
      {inquiry && cta && (
        <section className="sap-inquiry-strip" data-section="inquiry_section">
          <div className="sap-container">
            <div>
              {cta.subtitle && <p className="sap-eyebrow">{cta.subtitle}</p>}
              <h2>{cta.title}</h2>
              <RichText content={cta.description} />
            </div>
            <PublicButton settings={site} href={cta.button_url} text={cta.button_text} className="sap-button sap-button-white" />
          </div>
        </section>
      )}
      <footer className="sap-footer">
        <div className="sap-container sap-footer-grid">
          <div>
            <Brand name={site.brand_name} logo={site.logo_url} />
            <p>{site.footer_intro}</p>
            {site.social_footer && <SocialLinks settings={social} location="footer" />}
          </div>
          <nav aria-label="Footer products">
            <h3>Products</h3>
            {nav?.categories.filter((c) => !c.parent_id).map((c) => (
              <Link key={c.id} href={`/categories/${c.slug}`}>{c.name}</Link>
            ))}
          </nav>
          <nav aria-label="Footer navigation">
            <h3>Company</h3>
            <Link href="/about">About us</Link>
            {site.distributor_enabled && <Link href="/dujia">Become a distributor</Link>}
            {site.news_enabled && <Link href="/news">Insights &amp; news</Link>}
            <Link href="/contact_us">Contact us</Link>
            {site.catalog_enabled && <Link href="/download">{site.catalog_title || 'Product catalog'}</Link>}
          </nav>
          <div>
            <h3>Contact our team</h3>
            <CompanyContact site={site} />
            {site.catalog_enabled && <Link className="sap-button sap-button-outline" href="/download">Request catalog →</Link>}
          </div>
        </div>
        <div className="sap-container sap-footer-bottom">
          <span>{site.copyright_text || `© ${new Date().getFullYear()} ${site.company_name || site.brand_name}. All rights reserved.`}</span>
          <span>{site.footer_note}</span>
        </div>
      </footer>
      {site.whatsapp_floating && whatsapp && (
        <a className="sap-whatsapp-floating" href={whatsapp.href} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
          <FaWhatsapp aria-hidden="true" />
          <span>WhatsApp</span>
        </a>
      )}
    </div>
  );
}
