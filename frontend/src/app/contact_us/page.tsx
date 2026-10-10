import Shell from '@/components/storefront/Shell';
import ContactForm from '@/components/storefront/ContactForm';
import CompanyContact from '@/components/storefront/CompanyContact';
import SocialLinks from '@/components/storefront/SocialLinks';
import { getStorefrontSettings } from '@/services/storefront.server';
import { pageMetadata } from '@/lib/storefront-seo';
export const dynamic='force-dynamic';
export async function generateMetadata(){const {site}=await getStorefrontSettings();return pageMetadata('/contact_us','Contact us',site.inquiry_intro);}
export default async function Page(){const {site,social}=await getStorefrontSettings();return <Shell inquiry={false}><div className="legacy-article legacy-contact"><h1>Contact us</h1><div className="sap-contact-directory"><CompanyContact site={site}/><SocialLinks settings={social} location="contact"/></div><ContactForm config={site}/></div></Shell>;}
