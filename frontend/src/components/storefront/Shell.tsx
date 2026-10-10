import Link from 'next/link';
import type { ReactNode } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import { storefront, getStorefrontSettings, getB2BHome, type Navigation } from '@/services/storefront.server';
import Header from './Header';
import Brand from './Brand';
import SocialLinks, { configuredSocialLinks } from './SocialLinks';
import CompanyContact from './CompanyContact';
import PublicButton from './PublicButton';
import RichText from './RichText';

export default async function Shell({children,inquiry=true}:{children:ReactNode;inquiry?:boolean}){
 const [nav,config,home]=await Promise.all([storefront<Navigation>('navigation'),getStorefrontSettings(),getB2BHome()]);
 const {site,social}=config;const cta=home.sections.find(s=>s.section_key==='inquiry_section'&&s.is_active);const whatsapp=configuredSocialLinks(social).find(s=>s.key==='whatsapp_url');
 return <div className="legacy-site automotive-site"><a className="sap-skip" href="#main-content">Skip to content</a><Header categories={nav?.categories||[]} config={config}/><main id="main-content">{children}</main>
 {inquiry&&cta&&<section className="sap-inquiry-strip" data-section="inquiry_section"><div className="sap-container"><div>{cta.subtitle&&<p className="sap-eyebrow">{cta.subtitle}</p>}<h2>{cta.title}</h2><RichText content={cta.description}/></div><PublicButton settings={site} href={cta.button_url} text={cta.button_text} className="sap-button sap-button-white"/></div></section>}
 <footer className="sap-footer"><div className="sap-container sap-footer-grid"><div><Brand name={site.brand_name} logo={site.logo_url}/><p>{site.footer_intro}</p>{site.social_footer&&<SocialLinks settings={social} location="footer"/>}</div><nav aria-label="Footer products"><h3>Products</h3>{nav?.categories.filter(c=>!c.parent_id).map(c=><Link key={c.id} href={`/categories/${c.slug}`}>{c.name}</Link>)}</nav><nav aria-label="Footer navigation"><h3>Company</h3><Link href="/about">About us</Link>{site.distributor_enabled&&<Link href="/dujia">Become a distributor</Link>}{site.news_enabled&&<Link href="/news">Insights & news</Link>}<Link href="/contact_us">Contact us</Link>{site.catalog_enabled&&<Link href="/download">{site.catalog_title||'Product catalog'}</Link>}</nav><div><h3>Contact our team</h3><CompanyContact site={site}/>{site.catalog_enabled&&<Link className="sap-button sap-button-outline" href="/download">Request catalog →</Link>}</div></div><div className="sap-container sap-footer-bottom"><span>{site.copyright_text||`© ${new Date().getFullYear()} ${site.company_name||site.brand_name}. All rights reserved.`}</span><span>{site.footer_note}</span></div></footer>
 {site.whatsapp_floating&&whatsapp&&<a className="sap-whatsapp-floating" href={whatsapp.href} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp"><FaWhatsapp aria-hidden="true"/><span>WhatsApp</span></a>}</div>;
}
