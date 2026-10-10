import Shell from '@/components/storefront/Shell';
import ContactForm from '@/components/storefront/ContactForm';
import { pageMetadata } from '@/lib/storefront-seo';
import { getStorefrontSettings } from '@/services/storefront.server';
import { notFound } from 'next/navigation';
export const dynamic='force-dynamic';
export async function generateMetadata(){const {site}=await getStorefrontSettings();if(!site.distributor_enabled)notFound();return pageMetadata('/dujia','Become a Distributor',`Discuss automotive parts distribution with ${site.brand_name}.`);}
export default async function Page(){const {site}=await getStorefrontSettings();if(!site.distributor_enabled)notFound();return <Shell inquiry={false}><div className="legacy-article legacy-contact"><p className="sap-eyebrow">GROW YOUR PARTS BUSINESS</p><h1>Become a distributor</h1><p className="sap-muted">Tell us about your market, product requirements and expected quantities.</p><br/><ContactForm product="Distributor application" type="distributor" config={site}/></div></Shell>;}
