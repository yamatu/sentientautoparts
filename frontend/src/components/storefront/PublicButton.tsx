import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { publicLink } from '@/lib/public-links';
import type { StorefrontSettings } from '@/types/storefront';
export function enabledPublicLink(href:string,settings:StorefrontSettings){
 const path=href.split(/[?#]/)[0].replace(/\/$/,'');
 return !(path==='/download'&&!settings.catalog_enabled) && !(path==='/dujia'&&!settings.distributor_enabled) && !(path==='/news'&&!settings.news_enabled);
}
export default function PublicButton({href,text,settings,className='sap-button'}:{href?:string;text?:string;settings:StorefrontSettings;className?:string}){
 const target=publicLink(href);if(!target||!text||!enabledPublicLink(target,settings))return null;
 if(/^https?:/.test(target))return <a className={className} href={target} target="_blank" rel="noopener noreferrer">{text}<ArrowUpRight size={16}/></a>;
 return <Link className={className} href={target}>{text}<ArrowUpRight size={16}/></Link>;
}
