'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Search, ArrowUpRight, Snowflake, Mail, Phone } from 'lucide-react';
import type { Category, PublicSiteConfig } from '@/services/storefront.server';
import Brand from './Brand';
import SafeImage from './SafeImage';
import SocialLinks from './SocialLinks';
import { phoneLink } from '@/lib/public-links';

export default function Header({categories,config}:{categories:Category[];config:PublicSiteConfig}){
 const [open,setOpen]=useState(false);const {site,social}=config;const roots=categories.filter(c=>!c.parent_id);
 const links=[['/about','About us'],...(site.news_enabled?[['/news','Insights']]:[]),...(site.catalog_enabled?[['/download','Catalog']]:[])];
 return <><div className="sap-topbar"><div className="sap-container"><span>{site.tagline}</span><div className="sap-topbar-links">{site.contact_phone&&phoneLink(site.contact_phone)&&<a className="sap-topbar-contact" href={phoneLink(site.contact_phone)!} title="Call us"><Phone size={13}/>{site.contact_phone}</a>}{site.contact_email&&<a className="sap-topbar-contact" href={`mailto:${site.contact_email}`} title="Email us"><Mail size={13}/>{site.contact_email}</a>}{site.social_header&&<SocialLinks settings={social} location="header-topbar"/>}</div></div></div>
 <header className="sap-header"><div className="sap-container sap-header-inner"><Brand name={site.brand_name} logo={site.logo_url}/><nav className="sap-desktop-nav" aria-label="Main navigation"><div className="sap-nav-products"><Link href="/products">Products</Link><div className="sap-megamenu">{roots.map(c=><Link key={c.id} href={`/categories/${c.slug}`}>{c.image_url?<SafeImage src={c.image_url} alt={c.name} loading="lazy"/>:<Snowflake className="sap-megamenu-icon" size={30}/>}<span><strong>{c.name}</strong><span>{c.product_count?`${c.product_count.toLocaleString('en-US')} products`:'Contact us for availability'}</span></span></Link>)}</div></div>{links.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</nav><Link className="sap-button sap-header-quote" href="/contact_us">{site.quote_button_text||'Contact us'}<ArrowUpRight size={16}/></Link><button className="sap-menu-button" type="button" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="mobile-menu" aria-label="Toggle navigation">{open?<X/>:<Menu/>}</button></div>
 <nav id="mobile-menu" className="sap-mobile-nav" hidden={!open} aria-label="Mobile navigation"><div className="sap-container">{[['/products','Products'],...links,['/contact_us','Contact us']].map(([href,label])=><Link key={href} href={href} onClick={()=>setOpen(false)}>{label}</Link>)}<form action="/products"><input name="q" type="search" placeholder="OE number, ST code or vehicle" aria-label="Search products"/><button type="submit" aria-label="Search"><Search size={18}/></button></form></div></nav></header></>;
}
