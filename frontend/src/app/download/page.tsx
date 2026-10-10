import Shell from '@/components/storefront/Shell';
import CatalogDownload from '@/components/storefront/CatalogDownload';
import { pageMetadata } from '@/lib/storefront-seo';
import { getStorefrontSettings } from '@/services/storefront.server';
import { notFound } from 'next/navigation';
export const dynamic='force-dynamic';
export async function generateMetadata(){const {site}=await getStorefrontSettings();if(!site.catalog_enabled)notFound();return pageMetadata('/download',site.catalog_title,site.catalog_description);}
export default async function Page(){const {site}=await getStorefrontSettings();if(!site.catalog_enabled||!site.catalog_url)notFound();return <Shell inquiry={false}><div className="legacy-article legacy-contact"><h1>{site.catalog_title||'Product catalog'}</h1><CatalogDownload config={site}/></div></Shell>;}
