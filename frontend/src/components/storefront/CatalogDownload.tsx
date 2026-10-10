'use client';
import { useState } from 'react';
import type { StorefrontSettings } from '@/types/storefront';
import { publicLink } from '@/lib/public-links';
export default function CatalogDownload({config}:{config:StorefrontSettings}) {
 const [message,setMessage]=useState('');const [sent,setSent]=useState(false);const [pending,setPending]=useState(false);
 return <div className="sap-contact-form"><div className="sap-form-heading"><h2>{config.catalog_title||'Get the product catalog'}</h2><p>{config.catalog_description}</p></div><form onSubmit={async e=>{
  e.preventDefault();if(pending)return;const values=new FormData(e.currentTarget);if(values.get('website'))return;setPending(true);setMessage('');
  try{const r=await fetch('/api/v1/public/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:values.get('name'),email:values.get('email'),phone:values.get('phone'),subject:'Catalog download request',message:'Product catalog request',country:values.get('country'),inquiry_type:'catalog',source_page:'/download',website:values.get('website')})});if(!r.ok)throw new Error();setSent(true);setMessage('Thank you. Your catalog is ready to download.');}catch{setMessage('Unable to save your request. Please try again.');}finally{setPending(false);}
 }}><div className="sap-form-grid"><label>Name *<input name="name" autoComplete="name" required maxLength={100}/></label><label>Email *<input name="email" type="email" autoComplete="email" required maxLength={100}/></label><label>Country<input name="country" autoComplete="country-name" maxLength={80}/></label><label>Phone / WhatsApp<input name="phone" autoComplete="tel" maxLength={50}/></label></div><input name="website" tabIndex={-1} autoComplete="off" className="legacy-honeypot" aria-hidden="true"/><button className="sap-button" disabled={pending} type="submit">{pending?'Sending…':'Download Catalog'}</button><p role="status">{message}</p>{sent&&publicLink(config.catalog_url)&&<a className="sap-text-link" href={publicLink(config.catalog_url)!} target="_blank" rel="noopener noreferrer" download>Download PDF →</a>}</form></div>;
}
