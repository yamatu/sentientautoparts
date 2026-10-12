import Link from 'next/link';
import { Snowflake } from 'lucide-react';
import SafeImage from './SafeImage';
import { DEFAULT_BRAND_LOGO } from '@/lib/public-links';
export default function Brand({name,logo,tagline}:{name:string;logo?:string;tagline?:string}){
 const source=logo||DEFAULT_BRAND_LOGO;
 return <Link className="sap-logo" href="/" aria-label={`${name} home`}>{source?<SafeImage className="sap-brand-image" src={source} alt={name}/>:<><Snowflake aria-hidden="true"/><span>{name==='sentientautoparts'?<>sentient<span className="sap-logo-accent">autoparts</span></>:name}{tagline&&<small>{tagline}</small>}</span></>}</Link>;
}
