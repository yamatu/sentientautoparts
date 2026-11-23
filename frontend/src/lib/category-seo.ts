import type { Category, Product } from '@/services/storefront.server';
import type { CommercePolicySetting } from '@/types';
import {
  commercePolicyCarriers,
  commercePolicyDestinationCountries,
  commercePolicyHandlingText,
  commercePolicyTransitText,
  resolveWarrantyPeriod,
} from '@/lib/commerce-policy';
import { plainText } from '@/lib/storefront-seo';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface CategoryCatalogFacts {
  compressorSeries: string[];
  voltages: string[];
  pulleyGrooves: string[];
  refrigerants: string[];
  sampleOeNumbers: string[];
  sampleSkus: string[];
}

/**
 * Legacy site_pages keys that duplicate canonical storefront routes and should
 * redirect instead of being indexed separately.
 */
export const DUPLICATE_LEGACY_PAGE_REDIRECTS: Record<string, string> = {
  'legacy-page-139': '/contact_us',
  'legacy-page-156': '/about',
  'legacy-page-178': '/download',
  'legacy-page-177': '/dujia',
};

/**
 * Only non-empty categories belong in sitemap-categories.xml and search index.
 * Empty categories remain reachable for B2B inquiry with `noindex, follow`
 * until catalog SKUs are added.
 */
export function isCategoryIndexable(cat: Pick<Category, 'product_count'> | null | undefined): boolean {
  return Boolean(cat && (cat.product_count ?? 0) > 0);
}

/**
 * Builds an unambiguous search-friendly category display name without
 * duplicating part-type nouns (e.g. "Toyota" under "A/C Compressors" becomes
 * "Toyota A/C Compressors", while "Sanden Compressors" stays as-is).
 */
export function getCategoryDisplayName(cat?: Pick<Category, 'name' | 'slug' | 'parent_id'> | null, parent?: Pick<Category, 'name' | 'slug'> | null): string {
  const name = (cat?.name || '').trim();
  if (!name) return 'Automotive A/C Parts';
  if (!parent) return name;

  const lower = name.toLowerCase();
  const parentSlug = parent.slug.toLowerCase();
  if (parentSlug.includes('compressor')) {
    if (lower.includes('compressor')) return name;
    return `${name} A/C Compressors`;
  }
  if (parentSlug.includes('condenser')) {
    if (lower.includes('condenser')) return name;
    return `${name} Auto Condensers`;
  }
  if (parentSlug.includes('evaporator')) {
    if (lower.includes('evaporator')) return name;
    return `${name} Evaporator Units`;
  }
  if (parentSlug.includes('valve')) {
    if (lower.includes('valve')) return name;
    return `${name} Expansion Valves`;
  }
  return `${name} ${parent.name}`;
}

export function getCategoryMetaDescription(
  cat?: Pick<Category, 'name' | 'slug' | 'description' | 'product_count'> | null,
  parent?: Pick<Category, 'name' | 'slug'> | null,
  total?: number,
): string {
  const raw = plainText(cat?.description || '');
  const isJunk = !raw || raw.length < 50 || /product\s+bag\s+seo/i.test(raw);
  if (!isJunk) {
    if (raw.length <= 168) return raw;
    const cut = raw.slice(0, 165);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > 110 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:\s]+$/, '')}.`;
  }
  const displayName = getCategoryDisplayName(cat, parent);
  const count = total ?? cat?.product_count ?? 0;
  if (count > 0) {
    return `Factory-direct ${displayName} (${count.toLocaleString('en-US')} OE-spec models). ISO9001 certified, 100% helium leak tested, 12-month warranty. Wholesale B2B supply from SENTIENT Auto Parts.`;
  }
  return `Wholesale ${displayName} supplied on request by SENTIENT Auto Parts. Send your OE part number or vehicle application for factory-direct B2B quotation and lead time confirmation.`;
}

function uniqueValues(values: (string | undefined | null)[], limit: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const clean = String(v || '').trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= limit) break;
  }
  return out;
}

export function extractCategoryFacts(products: Product[]): CategoryCatalogFacts {
  return {
    compressorSeries: uniqueValues(products.map((p) => p.compressor_type), 6),
    voltages: uniqueValues(products.map((p) => p.voltage), 4),
    pulleyGrooves: uniqueValues(
      products.map((p) => (p.pulley_grooves ? (/pk|groove/i.test(p.pulley_grooves) ? p.pulley_grooves : `${p.pulley_grooves} grooves`) : '')),
      5,
    ),
    refrigerants: uniqueValues(products.map((p) => p.refrigerant), 3),
    sampleOeNumbers: uniqueValues(products.flatMap((p) => p.oe_numbers || []), 8),
    sampleSkus: uniqueValues(products.map((p) => p.model || p.sku), 6),
  };
}

function shippingScopeText(policy?: CommercePolicySetting): string {
  const countries = commercePolicyDestinationCountries(policy);
  if (!countries.length) return 'worldwide';
  return `to ${countries.join(', ')}`;
}

export function buildCategoryFaqs(
  displayName: string,
  total: number,
  facts: CategoryCatalogFacts,
  policy?: CommercePolicySetting,
): FAQItem[] {
  const warranty = resolveWarrantyPeriod(undefined, policy);
  const handling = commercePolicyHandlingText(policy);
  const transit = commercePolicyTransitText(policy);
  const carriers = commercePolicyCarriers(policy).join(', ');
  const scope = shippingScopeText(policy);

  const seriesNote = facts.compressorSeries.length
    ? ` Documented compressor platforms in this section include ${facts.compressorSeries.join(', ')}.`
    : '';
  const oeNote = facts.sampleOeNumbers.length
    ? ` Representative OE references include ${facts.sampleOeNumbers.slice(0, 5).join(', ')}.`
    : '';

  return [
    {
      question: `How do I verify fitment for ${displayName}?`,
      answer: `Match the original OE reference number, compressor platform, mounting ear layout, clutch pulley groove count and diameter, port orientation, and electrical connector before ordering.${seriesNote}${oeNote} If your application is not listed, send the OE number or vehicle VIN to our team for confirmation.`,
    },
    {
      question: `How many ${displayName} models are available and what is the MOQ?`,
      answer: `Our catalog currently indexes ${total.toLocaleString('en-US')} ${displayName} SKU${total === 1 ? '' : 's'} supplied factory-direct from Guangzhou, China. Standard B2B wholesale orders start from MOQ 8 pcs per model, with mixed-model trial or distributor orders confirmed by quotation.`,
    },
    {
      question: `What quality testing and warranty cover SENTIENT ${displayName}?`,
      answer: `SENTIENT Auto Parts operates under ISO9001 quality management. Every automotive A/C compressor is 100% pressure and helium leak tested with functional validation prior to shipment and carries a ${warranty} warranty plus technical support.`,
    },
    {
      question: `What are the lead time and shipping options for wholesale orders?`,
      answer: `In-stock items are normally dispatched within ${handling} after order confirmation, with express air delivery (${carriers}) typically taking ${transit} ${scope}. Sea and air consolidation options are also available for bulk distributor shipments.`,
    },
  ];
}

export function buildProductFaqs(
  product: Product,
  categoryDisplayName: string,
  policy?: CommercePolicySetting,
): FAQItem[] {
  const skuLabel = product.model || product.sku;
  const warranty = resolveWarrantyPeriod(undefined, policy);
  const handling = commercePolicyHandlingText(policy);
  const transit = commercePolicyTransitText(policy);
  const carriers = commercePolicyCarriers(policy).join(', ');
  const scope = shippingScopeText(policy);

  const oeList = (product.oe_numbers || []).filter(Boolean);
  const fitmentSummary = (product.fitments || [])
    .slice(0, 3)
    .map((f) => {
      const years = f.year_from
        ? f.year_to && f.year_to !== f.year_from
          ? ` (${f.year_from}-${f.year_to})`
          : ` (${f.year_from})`
        : '';
      return `${f.make} ${f.model || ''}${years}`.trim();
    })
    .filter(Boolean);

  const specBits = [
    product.compressor_type ? `compressor type ${product.compressor_type}` : '',
    product.voltage ? `${product.voltage} electrical system` : '',
    product.pulley_grooves ? `${product.pulley_grooves}-groove pulley` : '',
    product.pulley_diameter ? `${product.pulley_diameter} clutch diameter` : '',
  ].filter(Boolean);

  return [
    {
      question: `What OE numbers and vehicle applications match ${skuLabel}?`,
      answer: `${
        oeList.length
          ? `${skuLabel} is documented to cross-reference OE number${oeList.length > 1 ? 's' : ''} ${oeList.slice(0, 6).join(', ')}. `
          : `${skuLabel} is supplied in our ${categoryDisplayName} range. `
      }${
        fitmentSummary.length
          ? `Listed vehicle applications include ${fitmentSummary.join('; ')}. `
          : ''
      }${
        specBits.length ? `Key documented specifications: ${specBits.join(', ')}. ` : ''
      }Always verify the original OE code, mounting brackets, and port/connector layout with our team before bulk ordering.`,
    },
    {
      question: `What testing and warranty apply to ${skuLabel}?`,
      answer: `Manufactured under ISO9001 quality control by SENTIENT Auto Parts, each unit undergoes 100% pressure and helium leak testing before dispatch and is covered by a ${warranty} warranty for verified manufacturing defects.`,
    },
    {
      question: `How can I request wholesale pricing, MOQ, and delivery lead time for ${skuLabel}?`,
      answer: `Submit the inquiry form below with SKU ${skuLabel}, your required quantity, and destination country. Standard wholesale MOQ is 8 pcs per model; in-stock shipments dispatch within ${handling} with ${transit} estimated express transit (${carriers}) ${scope}.`,
    },
  ];
}
