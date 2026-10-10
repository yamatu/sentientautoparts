import { SITE_NAME } from '@/lib/seo';

const plain = (v?: string) => String(v || '').replace(/\s+/g, ' ').trim();
export function buildAutomotiveSEO(input: { name?: string; sku?: string; brand?: string; partNumber?: string; categoryName?: string }) {
  const name = plain(input.name) || [plain(input.brand), plain(input.partNumber || input.sku), plain(input.categoryName) || 'Auto A/C Part'].filter(Boolean).join(' ');
  const description = `${name}. Review OE references, vehicle application and A/C specifications. Contact ${SITE_NAME} to confirm fitment and request a quotation.`;
  return {
    metaTitle: `${name} | ${SITE_NAME}`.slice(0, 100),
    metaDescription: description.slice(0, 160),
    metaKeywords: [...new Set([input.partNumber, input.sku, input.name, input.brand, input.categoryName, 'automotive air conditioning parts', SITE_NAME].map(plain).filter(Boolean))].join(', '),
  };
}
