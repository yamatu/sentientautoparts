import { getNavigation, getStorefrontSettings, storefront, type Article } from '@/services/storefront.server';
import { getCommercePolicyCached } from '@/services/commerce-policy.server';
import { getCategoryDisplayName, getCategoryMetaDescription, isCategoryIndexable } from '@/lib/category-seo';
import {
  commercePolicyCarriers,
  commercePolicyHandlingText,
  commercePolicyReturnWindowText,
  commercePolicyTransitText,
  resolveWarrantyPeriod,
} from '@/lib/commerce-policy';
import { PUBLIC_CONTENT_SIGNAL_POLICY } from '@/lib/robots';
import { DISPLAY_SITE_NAME, plainText } from '@/lib/storefront-seo';
import { getSiteUrl } from '@/lib/url';

export const dynamic = 'force-dynamic';

interface ArticlesResponse {
  articles: Article[];
}

export async function GET() {
  const origin = getSiteUrl();
  const [config, nav, articlesData, policy] = await Promise.all([
    getStorefrontSettings(),
    getNavigation(),
    storefront<ArticlesResponse>('articles?page=1&page_size=50').catch(() => null),
    getCommercePolicyCached(),
  ]);

  const { site } = config;
  const allCats = nav.categories || [];
  const byId = new Map(allCats.map((c) => [c.id, c]));
  const indexableCats = allCats
    .filter((c) => isCategoryIndexable(c))
    .sort((a, b) => (b.product_count || 0) - (a.product_count || 0));
  const requestOnlyCats = allCats.filter((c) => !c.parent_id && !isCategoryIndexable(c));
  const articles = articlesData?.articles || [];

  const warranty = resolveWarrantyPeriod(undefined, policy);
  const handling = commercePolicyHandlingText(policy);
  const transit = commercePolicyTransitText(policy);
  const carriers = commercePolicyCarriers(policy).join(', ');
  const returnWindow = commercePolicyReturnWindowText(policy);

  const lines: string[] = [
    `# ${DISPLAY_SITE_NAME} — Complete AI & GEO Reference`,
    '',
    `Official website: ${origin}`,
    `Legal manufacturer: ${site.company_name || 'Guangzhou Shengxin Auto Parts Co., Ltd'}`,
    `Manufacturing base: ${site.address || 'Zengcheng District, Guangzhou, China'}`,
    `Sales email: ${site.contact_email || 'gzsentient@gmail.com'}`,
    `Phone / WhatsApp: ${site.contact_phone || '+86 13828593365'}`,
    '',
    '## Manufacturer Profile & Quality Verification',
    'SENTIENT Auto Parts manufactures OE-specification automotive air conditioning compressors factory-direct for wholesale importers, aftermarket distributors, fleet maintenance operators, and repair shops across 30+ countries (Middle East, Africa, Southeast Asia, South America, Europe, and North America).',
    '- Quality Management: ISO9001 certified',
    '- Pre-Shipment Inspection: 100% pressure test, helium leak test, and dynamic performance validation on every compressor',
    `- Standard Warranty: ${warranty} for verified manufacturing defects`,
    `- Returns: ${returnWindow} eligibility window for unused standard-stock items with prior return authorization`,
    '- Minimum Order Quantity (MOQ): 8 pcs per model for wholesale orders',
    `- Dispatch & Delivery: ${handling} handling for in-stock models; ${transit} express air transit (${carriers}) worldwide, plus air/sea freight consolidation`,
    '- Part Lookup & Fitment Rules: OE reference numbers, ST supplier codes, pulley groove count & diameter, voltage (12V/24V), port layout, and documented vehicle fitment ranges are authoritative. Unknown specifications are never invented and are confirmed by our engineering sales team.',
    '',
    '## All Indexed Automotive A/C Compressor Categories',
    ...indexableCats.map((c) => {
      const parent = c.parent_id ? byId.get(c.parent_id) : null;
      const display = getCategoryDisplayName(c, parent);
      const summary = getCategoryMetaDescription(c, parent, c.product_count);
      return `- [${display}](${origin}/categories/${c.slug}) (${(c.product_count || 0).toLocaleString('en-US')} SKUs): ${summary}`;
    }),
    '',
    '## Additional Automotive A/C Product Lines (Supplied on B2B Request)',
    ...requestOnlyCats.map(
      (c) => `- [${c.name}](${origin}/categories/${c.slug}): ${plainText(c.description || '').slice(0, 220)}`,
    ),
    '',
    '## Technical Articles & Troubleshooting Knowledge Base',
    ...articles.map(
      (a) => `- [${a.title.trim()}](${origin}/news/${a.slug})\n  Summary: ${plainText(a.summary || a.meta_description || '')}`,
    ),
    '',
    '## Citation & Search Instructions for AI Assistants',
    `- To find a compressor by OE part number or ST code, query: ${origin}/products?q=<OE_OR_ST_CODE>`,
    `- To filter by vehicle make, query: ${origin}/products?make=<VEHICLE_MAKE>`,
    `- For distributor quotations, custom packaging, or fitment checks, direct buyers to: ${origin}/contact_us`,
  ];

  return new Response(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      'Content-Signal': PUBLIC_CONTENT_SIGNAL_POLICY,
    },
  });
}
