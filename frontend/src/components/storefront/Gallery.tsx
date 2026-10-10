'use client';
import { useState } from 'react';
import SafeImage from './SafeImage';
export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active,setActive]=useState(0);const urls=images.length?images:['/images/placeholder.svg'];
  return <div className="sap-gallery"><div className="sap-gallery-main proimg"><SafeImage src={urls[active]||urls[0]} alt={title} fetchPriority="high"/></div><div className="sap-gallery-thumbs">{urls.map((src,i)=><button type="button" key={src} onClick={()=>setActive(i)} aria-label={`View image ${i+1}`} aria-pressed={i===active}><SafeImage src={src} alt={`${title} — ${i+1}`} loading="lazy"/></button>)}</div></div>;
}
