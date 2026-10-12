import sanitizeHtml from 'sanitize-html';
import Shell from '@/components/storefront/Shell';
import RichText from '@/components/storefront/RichText';
import SafeImage from '@/components/storefront/SafeImage';
import PublicButton from '@/components/storefront/PublicButton';
import CompanyContact from '@/components/storefront/CompanyContact';
import { getB2BHome, getStorefrontSettings } from '@/services/storefront.server';
import { pageMetadata } from '@/lib/storefront-seo';
export const dynamic='force-dynamic';
const DEFAULT_ABOUT_IMAGE='/legacy/theme/images/pro1.png';
// Same policy as RichText, plus the layout classes the about template is built from.
function aboutHtml(content:string){return sanitizeHtml(content,{allowedTags:[...sanitizeHtml.defaults.allowedTags,'img'],allowedAttributes:{a:['href','title','rel','class'],div:['class'],img:['src','alt','width','height','loading']},allowedClasses:{div:['about_item','flex_start','item','name','txt','bigname','bigtxt','send_box','you_list','you_item','info','h4','desc'],a:['send_btn']},allowedSchemes:['http','https','mailto','tel'],allowProtocolRelative:false,transformTags:{img:sanitizeHtml.simpleTransform('img',{loading:'lazy'}),a:sanitizeHtml.simpleTransform('a',{rel:'noopener noreferrer'})}});}
export async function generateMetadata(){const {site}=await getStorefrontSettings();return pageMetadata('/about',`About ${site.brand_name}`,site.footer_intro);}
export default async function Page(){
 const [home,{site}]=await Promise.all([getB2BHome(),getStorefrontSettings()]);
 const block=home.sections.find(b=>b.section_key==='about_content'&&b.is_active);
 const structured=!!block&&/class=["'][^"']*about_item/.test(block.description);
 return <Shell><section className="sap-about-heading"><div className="sap-container"><h1>{block?.title||`About ${site.brand_name}`}</h1>{block?.subtitle&&<p>{block.subtitle}</p>}</div></section>
 <section className="sap-container sap-about">{block?<div className={structured?'sap-about-grid':'sap-about-simple'}><div className="sap-about-visual"><SafeImage src={block.image_url||DEFAULT_ABOUT_IMAGE} alt={block.title}/></div>{structured?<div className="sap-about-content" dangerouslySetInnerHTML={{__html:aboutHtml(block.description)}}/>:<div><RichText content={block.description}/><PublicButton settings={site} text={block.button_text} href={block.button_url}/></div>}</div>:<div><p>Contact our team for company and product information.</p><CompanyContact site={site}/></div>}</section></Shell>;
}
