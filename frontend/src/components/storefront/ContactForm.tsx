'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import type { StorefrontSettings } from '@/types/storefront';

export default function ContactForm({ product = '', type='product', config }: { product?: string; type?:'product'|'distributor'; config:StorefrontSettings }) {
  const sourcePage=usePathname();
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  return <div className="sap-contact-form" id="inquiry">
    <div className="sap-form-heading"><h2>{config.inquiry_heading||'Inquire today'}</h2><p>{config.inquiry_intro}</p></div>
    <form onSubmit={async event => {
      event.preventDefault(); if (pending) return;
      const form = event.currentTarget; const data = new FormData(form);
      if (data.get('website')) return;
      setPending(true); setStatus('');
      try {
        const response = await fetch('/api/v1/public/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), email: data.get('email'), phone: data.get('phone'), company: data.get('company'), subject: product ? `Product inquiry: ${product}`.slice(0, 200) : 'Automotive parts inquiry', message: data.get('message'), country:data.get('country'), product_reference:data.get('product'), vehicle_details:data.get('vehicle'), quantity:data.get('quantity'), source_page:sourcePage, website:data.get('website'), inquiry_type: type }) });
        if (!response.ok) throw new Error(response.status === 429 ? 'Too many inquiries. Please try again later.' : 'Unable to send. Please try again.');
        setStatus(config.inquiry_success||'Thank you. Your inquiry has been received.'); form.reset();
      } catch (e) { setStatus(e instanceof Error ? e.message : 'Unable to send.'); }
      finally { setPending(false); }
    }}>
      <div className="sap-form-grid">
        <label>Name *<input name="name" autoComplete="name" required maxLength={100} placeholder="Your name" /></label>
        <label>Email *<input name="email" type="email" autoComplete="email" required maxLength={100} placeholder="you@company.com" /></label>
        <label>Phone / WhatsApp<input name="phone" autoComplete="tel" maxLength={50} placeholder="Country code + number" /></label>
        <label>Company<input name="company" autoComplete="organization" maxLength={100} placeholder="Company name" /></label>
        <label>Country<input name="country" autoComplete="country-name" maxLength={80} placeholder="Destination country" /></label>
        <label>Vehicle / VIN<input name="vehicle" maxLength={150} placeholder="Make, model, year or VIN" /></label>
        <label>Product / OE reference<input name="product" defaultValue={product} maxLength={300} placeholder="ST code or OE number" /></label>
        <label>Required quantity<input name="quantity" maxLength={80} placeholder="e.g. 20 pcs / mixed models" /></label>
        <label className="sap-form-full">Requirements *<textarea name="message" required maxLength={5000} rows={5} placeholder="Part references, quantities, specifications and any questions..." /></label>
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" className="legacy-honeypot" aria-hidden="true" />
      <button className="sap-button" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send Inquiry'}</button>
      <p role="status" aria-live="polite">{status}</p>
    </form>
  </div>;
}
