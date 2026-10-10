import Shell from '@/components/storefront/Shell';
import RichText from '@/components/storefront/RichText';
import SafeImage from '@/components/storefront/SafeImage';
import PublicButton from '@/components/storefront/PublicButton';
import CompanyContact from '@/components/storefront/CompanyContact';
import { getB2BHome, getStorefrontSettings } from '@/services/storefront.server';
import { pageMetadata } from '@/lib/storefront-seo';
export const dynamic='force-dynamic';
export async function generateMetadata(){const {site}=await getStorefrontSettings();return pageMetadata('/about',`About ${site.brand_name}`,site.footer_intro);}
export default async function Page(){const [home,{site}]=await Promise.all([getB2BHome(),getStorefrontSettings()]);const block=home.sections.find(b=>b.section_key==='about_content'&&b.is_active);return <Shell><section className="sap-page-heading"><div className="sap-container"><p className="sap-eyebrow">{block?.subtitle||site.tagline}</p><h1>{block?.title||`About ${site.brand_name}`}</h1></div></section><article className="legacy-article">{block?<>{block.image_url&&<SafeImage src={block.image_url} alt={block.title}/>}<RichText content={block.description}/><PublicButton settings={site} text={block.button_text} href={block.button_url}/></>:<p>Contact our team for company and product information.</p>}<CompanyContact site={site}/></article></Shell>;}
