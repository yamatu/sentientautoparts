import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import SafeImage from './SafeImage';
import { imageURLs, productPath, type Product } from '@/services/storefront.server';
export default function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) return <div className="sap-empty"><h2>No matching parts</h2><p>Try another OE reference or vehicle make, or send us your requirements.</p><Link className="sap-button" href="/contact_us">Ask our team</Link></div>;
  return <div className="sap-product-grid pro_list">{products.map(p => <article className="sap-product-card item" key={p.id}><Link className="sap-card-image" href={productPath(p)}><SafeImage src={imageURLs(p)[0]} alt={p.name} loading="lazy"/><span className="sap-card-type">{p.part_type || p.category.name}</span></Link><div className="sap-card-body"><p className="sap-card-sku">{p.model || p.sku}{p.vehicle_make ? ` · ${p.vehicle_make}` : ''}</p><h2><Link href={productPath(p)}>{p.name}</Link></h2>{p.oe_numbers?.length ? <p className="sap-card-oe"><span>OE REF.</span> {p.oe_numbers.slice(0,2).join(' / ')}</p> : <p className="sap-card-oe">Reference details on request</p>}<div className="sap-card-specs">{[p.compressor_type,p.voltage,p.pulley_grooves ? `${p.pulley_grooves} grooves` : ''].filter(Boolean).map((value,i)=><span key={i}>{value}</span>)}</div><Link className="sap-card-link" href={productPath(p)}>View part details <ArrowUpRight size={16}/></Link></div></article>)}</div>;
}
