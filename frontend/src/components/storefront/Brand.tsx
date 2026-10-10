import Link from 'next/link';
import { Snowflake } from 'lucide-react';
import SafeImage from './SafeImage';
export default function Brand({name,logo,tagline}:{name:string;logo?:string;tagline?:string}){
 return <Link className="sap-logo" href="/" aria-label={`${name} home`}>{logo?<SafeImage className="sap-brand-image" src={logo} alt={name}/>:<><Snowflake aria-hidden="true"/><span>{name==='sentientautoparts'?<>sentient<span className="sap-logo-accent">autoparts</span></>:name}{tagline&&<small>{tagline}</small>}</span></>}</Link>;
}
