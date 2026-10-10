import { Mail, MapPin, Phone, Clock } from 'lucide-react';
import type { StorefrontSettings } from '@/types/storefront';
import { phoneLink } from '@/lib/public-links';
export default function CompanyContact({site}:{site:StorefrontSettings}){
 return <address className="sap-company-contact">{site.company_name&&<strong>{site.company_name}</strong>}{site.contact_email&&<a href={`mailto:${site.contact_email}`}><Mail size={17}/>{site.contact_email}</a>}{site.contact_phone&&(phoneLink(site.contact_phone)?<a href={phoneLink(site.contact_phone)!}><Phone size={17}/>{site.contact_phone}</a>:<span><Phone size={17}/>{site.contact_phone}</span>)}{site.address&&<span><MapPin size={17}/>{site.address}</span>}{site.business_hours&&<span><Clock size={17}/>{site.business_hours}</span>}</address>;
}
