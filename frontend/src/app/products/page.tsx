import Catalog from '@/components/storefront/Catalog';
import { pageMetadata } from '@/lib/storefront-seo';
export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ q?: string; page?: string; make?: string; part_type?: string; year?: string }> };
export async function generateMetadata({ searchParams }: Props) { const filters=await searchParams; return { ...await pageMetadata('/products','Automotive A/C Parts','Search automotive A/C compressors, OE references and vehicle applications.'), ...(Object.values(filters).some(Boolean)?{robots:{index:false,follow:true}}:{}) }; }
export default async function Page({ searchParams }: Props) { const filters=await searchParams;return <Catalog {...filters} page={Math.max(1,Number(filters.page)||1)}/>; }
