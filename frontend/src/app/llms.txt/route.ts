import { getNavigation, getStorefrontSettings, storefront, type Article } from '@/services/storefront.server';
import { getCommercePolicyCached } from '@/services/commerce-policy.server';
import { getCategoryDisplayName, isCategoryIndexable } from '@/lib/category-seo';
import {
  commercePolicyCarriers,
  commercePolicyHandlingText,
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
    storefront<ArticlesResponse>('articles?page=1&page_size=20').catch(() => null),
    getCommercePolicyCached(),
  ]);

  const { site } = config;
  const allCats = nav.categories || [];
  const byId = new Map(allCats.map((c) => [c.id, c]));
  const rootCat = allCats.find((c) => !c.parent_id && (c.product_count ?? 0) > 0);
  const totalModels = rootCat?.product_count ?? allCats.reduce((acc, c) => acc + (!c.parent_id ? c.product_count || 0 : 0), 0);

  const topCategories = allCats
    .filter((c) => isCategoryIndexable(c))
    .sort((a, b) => (b.product_count || 0) - (a.product_count || 0))
    .slice(0, 35);

  const articles = articlesData?.articles || [];
  const warranty = resolveWarrantyPeriod(undefined, policy);
  const handling = commercePolicyHandlingText(policy);
  const transit = commercePolicyTransitText(policy);
  const carriers = commercePolicyCarriers(policy).join(', ');

  const lines: string[] = [
    `# ${DISPLAY_SITE_NAME}`,
    '',
    `> ${site.company_name || 'Guangzhou Shengxin Auto Parts Co., Ltd'} (${DISPLAY_SITE_NAME}) is an ISO9001-certified, factory-direct automotive A/C compressor manufacturer based in ${site.address || 'Zengcheng District, Guangzhou, China'}. We supply ${totalModels.toLocaleString('en-US')}+ OE-spec automotive A/C compressor models across 80+ vehicle makes to importers, wholesale distributors, and fleet workshops in 30+ countries.`,
    '',
    '## Core Facts & Commercial Terms',
    `- Manufacturer: ${site.company_name || 'Guangzhou Shengxin Auto Parts Co., Ltd'} (${DISPLAY_SITE_NAME})`,
    `- Location: ${site.address || 'Zengcheng District, Guangzhou, China'}`,
    `- Core Catalog: ${totalModels.toLocaleString('en-US')}+ automotive A/C compressor SKUs (Denso, Sanden, Valeo, Delphi, Doowon, Hanon platforms), plus B2B sourcing on request for Auto Condensers, Evaporator Units, and Expansion Valves`,
    '- Quality Assurance: ISO9001 certified, 100% pressure and helium leak tested with functional validation prior to shipment',
    `- Standard B2B Terms: MOQ 8 pcs per model · ${warranty} warranty · ${handling} handling for in-stock items · ${transit} express delivery (${carriers}) worldwide`,
    `- Contact: ${site.contact_email || 'gzsentient@gmail.com'} | Phone/WhatsApp: ${site.contact_phone || '+86 13828593365'}`,
    '',
    '## Key Storefront Pages',
    `- [Homepage](${origin}/): Factory overview, catalog search, and featured A/C compressors`,
    `- [Full Product Catalog](${origin}/products): Search by OE reference number, ST code, vehicle make, part type, or year`,
    `- [About Us](${origin}/about): Factory background, quality assurance, and global partner testimonials`,
    `- [Request a Quote / Contact](${origin}/contact_us): Submit OE numbers or vehicle fitment details for wholesale pricing`,
    `- [Product Catalog Download](${origin}/download): Request the official SENTIENT PDF catalog`,
    `- [Distributor Program](${origin}/dujia): Regional wholesale and exclusive distributor inquiries`,
    `- [Warranty Policy](${origin}/warranty-policy): ${warranty} coverage and claims process`,
    `- [Shipping Policy](${origin}/shipping-policy): Handling times, international express/freight carriers, and packaging`,
    `- [Returns Policy](${origin}/returns): Return authorization and inspection rules`,
    `- [Technical Support](${origin}/technical-support): Fitment verification and installation troubleshooting`,
    '',
    '## Top Indexed Product Categories',
    ...topCategories.map((c) => {
      const parent = c.parent_id ? byId.get(c.parent_id) : null;
      const display = getCategoryDisplayName(c, parent);
      return `- [${display}](${origin}/categories/${c.slug}): ${(c.product_count || 0).toLocaleString('en-US')} indexed SKUs`;
    }),
    '',
    '## Technical Guides & Engineering Insights',
    ...articles.map(
      (a) => `- [${a.title.trim()}](${origin}/news/${a.slug}): ${plainText(a.summary || a.meta_description || '').slice(0, 180)}`,
    ),
    '',
    '## Machine-Readable Discovery',
    `- [Complete AI Catalog Reference (llms-full.txt)](${origin}/llms-full.txt)`,
    `- [XML Sitemap Index](${origin}/sitemap.xml)`,
    `- [Categories Sitemap](${origin}/sitemap-categories.xml)`,
    `- [Products Sitemap Page 1](${origin}/sitemap-products/1.xml)`,
  ];

  return new Response(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      'Content-Signal': PUBLIC_CONTENT_SIGNAL_POLICY,
    },
  });
}
