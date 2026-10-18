import Shell from '@/components/storefront/Shell';
import Link from 'next/link';
import { ArrowUpRight, Info } from 'lucide-react';
import Gallery from '@/components/storefront/Gallery';
import RichText from '@/components/storefront/RichText';
import ContactForm from '@/components/storefront/ContactForm';
import { storefront, imageURLs, productPath, getStorefrontSettings, type Product } from '@/services/storefront.server';
import { pageMetadata, plainText, jsonLD } from '@/lib/storefront-seo';
import { getSiteUrl } from '@/lib/url';
import { notFound, permanentRedirect } from 'next/navigation';
import { redirectLegacyPath } from '@/lib/legacy-route.server';
export const dynamic = 'force-dynamic';
type Props={params:Promise<{slug:string}>};
async function load(slug:string){const p=await storefront<Product>(`products/${encodeURIComponent(slug)}`);if(!p){await redirectLegacyPath('/products/'+slug);notFound();}return p;}
export async function generateMetadata({params}:Props){const p=await load((await params).slug);return pageMetadata(productPath(p),p.meta_title||p.name,p.meta_description||p.short_description,p.meta_keywords,imageURLs(p)[0]);}
export default async function Page({params}:Props){
 const {slug}=await params;const p=await load(slug);if(productPath(p).slice('/products/'.length)!==slug)permanentRedirect(productPath(p));
 const {site}=await getStorefrontSettings();
 const images=imageURLs(p);const canonical=getSiteUrl()+productPath(p);
 const specs:[string,string|undefined][]=[['Part type',p.part_type],['Supplier model / ST code',p.model],['Part brand',p.brand],['Vehicle make',p.vehicle_make],['Compressor series',p.compressor_type],['Refrigerant',p.refrigerant],['Voltage',p.voltage],['Pulley grooves',p.pulley_grooves],['Pulley diameter',p.pulley_diameter],['Displacement',p.displacement],['Oil type',p.oil_type],['Oil capacity',p.oil_capacity]];
 const populated=specs.filter(([,v])=>v);
 // Google rejects Product markup without an offer, review or rating, and this
 // quote-only page shows none of them, so it is described as an ItemPage.
 const absoluteImages=images.map(src=>src.startsWith('/')?getSiteUrl()+src:src);
 const schema={'@context':'https://schema.org','@type':'ItemPage',name:p.name,description:plainText(p.short_description||p.description),url:canonical,image:absoluteImages,primaryImageOfPage:absoluteImages[0]?{'@type':'ImageObject',url:absoluteImages[0]}:undefined,keywords:[p.sku,p.part_number,...(p.oe_numbers||[])].filter(Boolean).join(', ')||undefined};
 return <Shell inquiry={false}><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLD(schema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLD({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:getSiteUrl()},{'@type':'ListItem',position:2,name:'Products',item:getSiteUrl()+'/products'},{'@type':'ListItem',position:3,name:p.name,item:canonical}]})}}/>
 <div className="sap-container sap-product-page"><div className="sap-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/products">Products</Link><span>/</span><Link href={`/categories/${p.category.slug}`}>{p.category.name}</Link></div>
 <section className="sap-product-overview"><Gallery images={images} title={p.name}/><div className="sap-product-info"><p className="sap-eyebrow">{p.part_type||'AUTOMOTIVE A/C PART'}</p><h1>{p.name}</h1><p className="sap-product-sku">ST / SKU <strong>{p.model||p.sku}</strong></p><p className="sap-product-intro">{plainText(p.short_description)}</p>{p.oe_numbers?.length? <div className="sap-reference-box"><h2>OE / part references</h2><div>{p.oe_numbers.map(ref=><span key={ref}>{ref}</span>)}</div></div>:null}{p.interchange_numbers?.length?<div className="sap-reference-box"><h2>Interchange references</h2><p>{p.interchange_numbers.join(' / ')}</p></div>:null}<div className="sap-quick-specs">{populated.filter(([name])=>['Vehicle make','Compressor series','Voltage','Pulley grooves'].includes(name)).map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="sap-fitment-note"><Info size={19}/><p>Match the OE reference, vehicle details, mounting and pulley specifications before ordering. Contact us to confirm your application.</p></div><a className="sap-button" href="#inquiry">Request a quote <ArrowUpRight size={18}/></a></div></section>
 <nav className="sap-detail-nav" aria-label="Product sections"><a href="#specifications">Specifications</a><a href="#fitment">Vehicle fitment</a><a href="#source-details">Product details</a><a href="#inquiry">Send inquiry</a></nav>
 <section className="sap-product-section" id="specifications"><p className="sap-eyebrow">TECHNICAL DATA</p><h2>Product specifications</h2><dl className="sap-spec-table">{populated.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="sap-muted">Only documented specifications are shown. Please ask us about any missing parameter.</p></section>
 <section className="sap-product-section" id="fitment"><p className="sap-eyebrow">VEHICLE APPLICATION</p><h2>Fitment reference</h2>{p.fitments?.length?<div className="sap-table-scroll"><table className="sap-fitment-table"><thead><tr><th>Make</th><th>Model / application</th><th>Years</th><th>Engine</th></tr></thead><tbody>{p.fitments.map((f,i)=><tr key={i}><td>{f.make}</td><td>{f.model||'—'}</td><td>{f.year_from||'—'}{f.year_to!==f.year_from?` – ${f.year_to||'open / confirm'}`:''}</td><td>{f.engine||'Confirm with us'}</td></tr>)}</tbody></table></div>:<p>{p.fitment_notes||'Send your VIN, vehicle model and OE number for a fitment check.'}</p>}<p className="sap-muted">References are imported catalogue data, not a universal fit guarantee.</p></section>
 <section className="sap-product-section" id="source-details"><h2>Product details</h2><RichText content={p.description||p.short_description}/>{p.attributes?.map((a,i)=><details key={i}><summary>{a.attribute_name}</summary><RichText content={a.attribute_value}/></details>)}</section>
 <section className="sap-product-section sap-product-inquiry"><div><p className="sap-eyebrow">LET’S TALK PARTS</p><h2>Request details for {p.model||p.sku}</h2><p>Include your vehicle, OE reference, required quantity and destination.</p></div><ContactForm product={`${p.sku} — ${p.name}`} config={site}/></section></div>
 </Shell>;
}
