import Catalog from '@/components/storefront/Catalog';
import { storefront, type ProductList } from '@/services/storefront.server';
import { pageMetadata } from '@/lib/storefront-seo';
import { notFound } from 'next/navigation';
import { redirectLegacyPath } from '@/lib/legacy-route.server';
// Reads searchParams (filters/pagination), so it stays request-rendered. Under
// the static [locale] layout, dropping this makes the page 500 at runtime with
// DYNAMIC_SERVER_USAGE. Its backend reads still use the Data Cache.
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ categoryPath: string[] }>; searchParams: Promise<{ page?: string; q?: string; make?: string; year?: string; part_type?: string }> };
export async function generateMetadata({ params, searchParams }: Props) {
 const {categoryPath}=await params;await redirectLegacyPath('/categories/'+categoryPath.join('/'));const slug=categoryPath.at(-1)||'';
 const data=await storefront<ProductList>(`products?category=${encodeURIComponent(slug)}&page_size=1`);if(!data)notFound();
 const filters=await searchParams;return {...await pageMetadata(`/categories/${slug}`,data.category?.name||'Auto A/C Parts',data.category?.description||'Explore OE references, automotive A/C specifications and vehicle applications.'),...(Object.values(filters).some(Boolean)?{robots:{index:false,follow:true}}:{})};
}
export default async function Page({params,searchParams}:Props){const {categoryPath}=await params;await redirectLegacyPath('/categories/'+categoryPath.join('/'));const filters=await searchParams;return <Catalog category={categoryPath.at(-1)} {...filters} page={Math.max(1,Number(filters.page)||1)}/>;}
