import Shell from '@/components/storefront/Shell';
import Link from 'next/link';
import { Search, Snowflake, ChevronRight } from 'lucide-react';
import SafeImage from '@/components/storefront/SafeImage';
import ProductGrid from '@/components/storefront/ProductGrid';
import RichText from '@/components/storefront/RichText';
import PublicButton from '@/components/storefront/PublicButton';
import BannerCarousel from '@/components/storefront/BannerCarousel';
import { configuredSocialLinks } from '@/components/storefront/SocialLinks';
import { storefront, getStorefrontSettings, getB2BHome, type ProductList, type Navigation, type HomeBlock } from '@/services/storefront.server';
import { pageMetadata, jsonLD } from '@/lib/storefront-seo';
import { getSiteUrl } from '@/lib/url';
import { publicLink } from '@/lib/public-links';
import { redirect } from 'next/navigation';
export const dynamic='force-dynamic';
export async function generateMetadata(){const {site}=await getStorefrontSettings();return pageMetadata('/',site.home_meta_title||site.brand_name,site.home_meta_description,site.home_meta_keywords,site.logo_url||undefined);}
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams;if(query.m==='Search'&&typeof query.keyword==='string')redirect(`/products?q=${encodeURIComponent(query.keyword)}`);
 const [home,config,count,nav]=await Promise.all([getB2BHome(),getStorefrontSettings(),storefront<ProductList>('products?page_size=1'),storefront<Navigation>('navigation')]);
 const {site,social}=config;const roots=nav?.categories.filter(c=>!c.parent_id)||[];const advantages=home.sections.filter(b=>b.section_key.startsWith('advantage_')&&b.is_active);
 const heading=(b:HomeBlock)=><div className="sap-section-heading"><div>{b.subtitle&&<p className="sap-eyebrow">{b.subtitle}</p>}{b.title&&<h2>{b.title}</h2>}{b.description&&<RichText content={b.description}/>}</div><PublicButton href={b.button_url} text={b.button_text} settings={site} className="sap-text-link"/></div>;
 const render=(b:HomeBlock)=>{
  if(!b.is_active||b.section_key==='about_content'||b.section_key.startsWith('advantage_'))return null;
  switch(b.section_key){
   case 'hero_section':return <section className="sap-hero home_banner" data-section={b.section_key} key={b.section_key}><div className="sap-container sap-hero-grid"><div>{b.subtitle&&<p className="sap-eyebrow"><Snowflake size={16}/>{b.subtitle}</p>}<h1>{b.title}</h1><div className="sap-hero-copy"><RichText content={b.description}/></div><div className="sap-hero-actions"><PublicButton settings={site} href={b.button_url} text={b.button_text}/><PublicButton settings={site} href={String(b.data?.secondary_url??'/download')} text={String(b.data?.secondary_text??'Download catalog')} className="sap-text-link"/></div>{b.data?.show_stats!==false&&<div className="sap-hero-stats"><span><strong>{count?.total.toLocaleString('en-US')||'0'}</strong>Catalog products</span><span><strong>{nav?.makes?.length||'0'}</strong>Vehicle makes</span><span><strong>OE</strong>Reference search</span></div>}</div>{publicLink(b.image_url)&&<div className="sap-hero-visual"><div className="sap-hero-ring"/><SafeImage src={b.image_url} alt={b.title} fetchPriority="high"/></div>}</div></section>;
   case 'search_section':return <section className="sap-container sap-search-section" data-section={b.section_key} key={b.section_key}><form action="/products" className="sap-home-search"><div><Search size={22}/><label htmlFor="part-search">{b.title}<span>{b.subtitle}</span></label></div><input id="part-search" name="q" type="search" placeholder={b.description} maxLength={200}/><select aria-label="Vehicle make" name="make"><option value="">All vehicle makes</option>{nav?.makes.map(make=><option key={make}>{make}</option>)}</select><button className="sap-button" type="submit">{b.button_text||'Search'}</button></form></section>;
   case 'product_range':return <section className="sap-section sap-container" data-section={b.section_key} key={b.section_key}>{heading(b)}<div className="sap-category-cards">{roots.map((c,i)=><Link key={c.id} href={`/categories/${c.slug}`}><span className="sap-category-number">0{i+1}</span>{c.image_url?<SafeImage className="sap-category-image" src={c.image_url} alt={c.name} loading="lazy"/>:<Snowflake size={32}/>}<h3>{c.name}</h3><p>{c.product_count?`${c.product_count.toLocaleString('en-US')} catalog products`:'Contact us for availability'}</p><span className="sap-category-arrow">↗</span></Link>)}</div></section>;
   case 'vehicle_makes':return <section className="sap-makes-section" data-section={b.section_key} key={b.section_key}><div className="sap-container">{heading(b)}<div className="sap-make-chips">{nav?.makes.map(make=><Link key={make} href={`/products?make=${encodeURIComponent(make)}`}>{make}<ChevronRight size={14}/></Link>)}</div></div></section>;
   case 'featured_products':return <section className="sap-section sap-container" data-section={b.section_key} key={b.section_key}>{heading(b)}<ProductGrid products={home.products}/></section>;
   case 'advantages_section':return advantages.length?<section className="sap-advantages sap-section" data-section={b.section_key} key={b.section_key}><div className="sap-container">{heading(b)}<div className="sap-advantage-grid">{advantages.map(a=><article key={a.section_key} data-section={a.section_key}>{a.image_url&&<SafeImage src={a.image_url} alt={a.title} loading="lazy"/>}<div><h3>{a.title}</h3>{a.subtitle&&<p>{a.subtitle}</p>}{a.description&&<RichText content={a.description}/>}<PublicButton settings={site} href={a.button_url} text={a.button_text} className="sap-text-link"/></div></article>)}</div></div></section>:null;
   case 'home_banners':return home.banners.length?<section className="sap-section sap-container" data-section={b.section_key} key={b.section_key}>{heading(b)}<BannerCarousel banners={home.banners}/></section>:null;
   case 'home_news':return site.news_enabled&&home.articles.length?<section className="sap-section sap-container" data-section={b.section_key} key={b.section_key}>{heading(b)}<div className="legacy-articles">{home.articles.map(a=><article key={a.id}><Link href={`/news/${a.slug}`}>{a.featured_image&&<SafeImage src={a.featured_image} alt={a.title} loading="lazy"/>}<h3>{a.title}</h3></Link><p>{a.summary}</p></article>)}</div></section>:null;
   case 'inquiry_section':return <section className="sap-inquiry-strip" data-section={b.section_key} key={b.section_key}><div className="sap-container"><div>{b.subtitle&&<p className="sap-eyebrow">{b.subtitle}</p>}<h2>{b.title}</h2><RichText content={b.description}/></div><PublicButton settings={site} href={b.button_url} text={b.button_text} className="sap-button sap-button-white"/></div></section>;
   default:return b.section_key.startsWith('custom_')?<section className="sap-section sap-container sap-custom-section" data-section={b.section_key} key={b.section_key}>{heading(b)}{b.image_url&&<SafeImage src={b.image_url} alt={b.title} loading="lazy"/>}</section>:null;
  }
 };
 const sameAs=configuredSocialLinks(social).filter(l=>l.key!=='whatsapp_url').map(l=>l.href);
 return <Shell inquiry={false}><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLD({'@context':'https://schema.org','@type':'Organization',name:site.company_name||site.brand_name,url:getSiteUrl(),...(site.logo_url?{logo:site.logo_url.startsWith('/')?getSiteUrl()+site.logo_url:site.logo_url}:{}),...(sameAs.length?{sameAs}:{}),...(site.contact_email?{email:site.contact_email}:{}),...(site.contact_phone?{telephone:site.contact_phone}:{})})}}/>{home.sections.map(render)}</Shell>;
}
