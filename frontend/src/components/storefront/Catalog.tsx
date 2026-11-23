import Shell from './Shell';
import Link from 'next/link';
import ProductGrid from './ProductGrid';
import SafeImage from './SafeImage';
import CategorySubcategoriesBar from './CategorySubcategoriesBar';
import {
  storefront,
  getNavigation,
  imageURLs,
  productPath,
  type ProductList,
  type CatalogFilters,
} from '@/services/storefront.server';
import { getCommercePolicyCached } from '@/services/commerce-policy.server';
import {
  buildCategoryFaqs,
  extractCategoryFacts,
  getCategoryDisplayName,
  getCategoryMetaDescription,
} from '@/lib/category-seo';
import {
  commercePolicyCarriers,
  commercePolicyHandlingText,
  commercePolicyTransitText,
  resolveWarrantyPeriod,
} from '@/lib/commerce-policy';
import { breadcrumbSchema, jsonLD, plainText, toAbsoluteUrl } from '@/lib/storefront-seo';
import { getSiteUrl } from '@/lib/url';
import { notFound } from 'next/navigation';

export default async function Catalog({
  category,
  q = '',
  make = '',
  part_type = '',
  year = '',
  page = 1,
}: CatalogFilters & { category?: string }) {
  if (!Number.isInteger(page) || page > 1000000 || (year && !/^(19|20)\d{2}$/.test(year)) || q.length > 200) {
    notFound();
  }
  const params = new URLSearchParams({ page: String(page), q, make, part_type, year });
  if (category) params.set('category', category);

  const [data, nav, policy] = await Promise.all([
    storefront<ProductList>(`products?${params}`),
    getNavigation(),
    getCommercePolicyCached(),
  ]);
  if (!data || (page > 1 && page > data.total_pages)) notFound();

  const path = category ? `/categories/${category}` : '/products';
  const pageURL = (n: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (make) sp.set('make', make);
    if (part_type) sp.set('part_type', part_type);
    if (year) sp.set('year', year);
    if (n > 1) sp.set('page', String(n));
    const qs = sp.toString();
    return qs ? `${path}?${qs}` : path;
  };

  const pageNumbers = [...new Set([1, ...Array.from({ length: 5 }, (_, i) => page - 2 + i), data.total_pages])]
    .filter((n) => n > 0 && n <= data.total_pages)
    .sort((a, b) => a - b);

  const allCategories = nav?.categories || [];
  const roots = allCategories.filter((c) => !c.parent_id);
  const currentNavCat = category ? allCategories.find((c) => c.slug === category) || data.category : null;
  const parentCat = currentNavCat?.parent_id
    ? allCategories.find((c) => c.id === currentNavCat.parent_id) || null
    : null;
  const childCats = currentNavCat
    ? allCategories
        .filter((c) => c.parent_id === currentNavCat.id && (c.product_count ?? 0) > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          image_url: c.image_url || c.menu_image_url || c.product_image || '',
          product_count: c.product_count ?? 0,
        }))
    : [];

  const displayName = category ? getCategoryDisplayName(data.category || currentNavCat, parentCat) : 'Automotive A/C Parts Catalog';
  const h1Text = category ? displayName : 'Find the right part';
  const categoryImage =
    currentNavCat?.image_url ||
    currentNavCat?.menu_image_url ||
    currentNavCat?.product_image ||
    data.category?.image_url ||
    data.category?.menu_image_url ||
    '';

  const fullCategoryDescription = plainText(data.category?.description || currentNavCat?.description || '');
  const hasRichDescription = fullCategoryDescription.length >= 60 && !/product\s+bag\s+seo/i.test(fullCategoryDescription);
  const heroLead = category
    ? getCategoryMetaDescription(data.category || currentNavCat, parentCat, data.total)
    : 'Search 1,580+ factory-direct automotive A/C compressors by OE reference number, ST code, vehicle make, or compressor model.';

  const hasFilters = Boolean(q || make || part_type || year);
  const isCanonicalFirstPage = page === 1 && !hasFilters;
  const showGeoSection = Boolean(category && isCanonicalFirstPage && data.total > 0);
  const facts = extractCategoryFacts(data.products);
  const faqs = showGeoSection ? buildCategoryFaqs(displayName, data.total, facts, policy) : [];

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}${path}`;
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    ...(parentCat ? [{ name: parentCat.name, path: `/categories/${parentCat.slug}` }] : []),
    ...(category ? [{ name: displayName, path }] : []),
  ];

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: displayName,
    description: heroLead,
    url: canonicalUrl,
    ...(categoryImage ? { primaryImageOfPage: { '@type': 'ImageObject', url: toAbsoluteUrl(categoryImage) } } : {}),
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: { '@id': `${siteUrl}/#organization` },
    ...(data.products.length > 0
      ? {
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: data.total,
            itemListElement: data.products.map((p, idx) => ({
              '@type': 'ListItem',
              position: (page - 1) * (data.page_size || 12) + idx + 1,
              url: `${siteUrl}${productPath(p)}`,
              name: p.name,
              ...(imageURLs(p)[0] ? { image: toAbsoluteUrl(imageURLs(p)[0]) } : {}),
            })),
          },
        }
      : {}),
  };

  const faqSchema = faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }
    : null;

  const warrantyText = resolveWarrantyPeriod(undefined, policy);
  const handlingText = commercePolicyHandlingText(policy);
  const transitText = commercePolicyTransitText(policy);
  const carriersText = commercePolicyCarriers(policy).join(', ');

  return (
    <Shell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD(breadcrumbSchema(breadcrumbItems)) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD(faqSchema) }} />}

      <section className="sap-page-heading">
        <div className="sap-container">
          <div className={category && categoryImage ? 'sap-cat-hero-grid' : ''}>
            <div className="sap-cat-hero-copy">
              <nav className="sap-breadcrumb" aria-label="Breadcrumb">
                <Link href="/">Home</Link>
                <span aria-hidden="true">/</span>
                <Link href="/products">Products</Link>
                {parentCat && (
                  <>
                    <span aria-hidden="true">/</span>
                    <Link href={`/categories/${parentCat.slug}`}>{parentCat.name}</Link>
                  </>
                )}
                {category && (
                  <>
                    <span aria-hidden="true">/</span>
                    <span aria-current="page">{displayName}</span>
                  </>
                )}
              </nav>
              <p className="sap-eyebrow">AUTOMOTIVE A/C CATALOG</p>
              <h1>{h1Text}</h1>
              <p className="sap-cat-hero-desc">{heroLead}</p>
              {category && (
                <div className="sap-cat-hero-badges">
                  {data.total > 0 ? (
                    <span>{data.total.toLocaleString('en-US')} OE-Spec Models</span>
                  ) : (
                    <span>Available on B2B Request</span>
                  )}
                  <span>ISO9001 Certified</span>
                  <span>100% Leak Tested</span>
                  <span>{warrantyText} Warranty</span>
                </div>
              )}
            </div>
            {category && categoryImage && (
              <div className="sap-cat-hero-visual">
                <SafeImage src={categoryImage} alt={displayName} fetchPriority="high" />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="sap-container sap-catalog-layout">
        <aside className="sap-category-sidebar">
          <h2>Browse categories</h2>
          <Link className={!category ? 'is-active' : ''} href="/products">
            All products
          </Link>
          {roots.map((root) => (
            <details
              key={root.id}
              open={
                root.id === data.category?.id ||
                allCategories.some((c) => c.parent_id === root.id && c.slug === category) ||
                undefined
              }
            >
              <summary>
                <Link className={root.slug === category ? 'is-active' : ''} href={`/categories/${root.slug}`}>
                  {root.name}
                  <span>{root.product_count || 0}</span>
                </Link>
              </summary>
              <div>
                {allCategories
                  .filter((c) => c.parent_id === root.id)
                  .map((c) => (
                    <Link className={c.slug === category ? 'is-active' : ''} key={c.id} href={`/categories/${c.slug}`}>
                      {c.name}
                      <span>{c.product_count || 0}</span>
                    </Link>
                  ))}
              </div>
            </details>
          ))}
          <div className="sap-filter-tip">
            Need help matching a part?
            <Link href="/contact_us">Send us the OE number →</Link>
          </div>
        </aside>

        <div className="sap-catalog-results">
          {childCats.length > 0 && isCanonicalFirstPage && (
            <CategorySubcategoriesBar parentName={displayName} items={childCats} />
          )}

          <form className="sap-filter-form" action={path}>
            <label className="sap-filter-query">
              OE / ST code / model
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="e.g. 88320-0C010 or ST-10025"
                maxLength={200}
              />
            </label>
            <label>
              Vehicle make
              <select name="make" defaultValue={make}>
                <option value="">All makes</option>
                {nav?.makes.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Part type
              <select name="part_type" defaultValue={part_type}>
                <option value="">All types</option>
                {nav?.part_types.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Year
              <input name="year" type="number" min="1900" max="2099" placeholder="Year" defaultValue={year} />
            </label>
            <button className="sap-button" type="submit">
              Find parts
            </button>
          </form>

          <div className="sap-results-bar">
            <p>
              <strong>{data.total.toLocaleString('en-US')}</strong> matching products
            </p>
            {hasFilters && <Link href={path}>Clear filters ×</Link>}
            <span>
              Page {page} / {Math.max(1, data.total_pages)}
            </span>
          </div>

          {year && (
            <p className="sap-fitment-disclaimer">
              Year filtering includes only explicitly documented, closed year ranges. Confirm open-ended or unlisted applications with our team.
            </p>
          )}

          <ProductGrid products={data.products} />

          {data.total_pages > 1 && (
            <nav className="sap-pagination" aria-label="Pagination">
              {page > 1 && (
                <Link href={pageURL(page - 1)} rel="prev">
                  ← Previous
                </Link>
              )}
              {pageNumbers.map((n, i) => (
                <span key={n}>
                  {i > 0 && n > pageNumbers[i - 1] + 1 && <span className="sap-page-gap">…</span>}
                  <Link aria-current={n === page ? 'page' : undefined} href={pageURL(n)}>
                    {n}
                  </Link>
                </span>
              ))}
              {page < data.total_pages && (
                <Link href={pageURL(page + 1)} rel="next">
                  Next →
                </Link>
              )}
            </nav>
          )}

          {showGeoSection && (
            <section className="sap-geo-guide" id="category-sourcing-guide" aria-label={`${displayName} wholesale sourcing guide`}>
              <p className="sap-eyebrow">FACTORY-DIRECT WHOLESALE OVERVIEW</p>
              <h2>{displayName}: Technical Sourcing &amp; Fitment Guide</h2>
              {hasRichDescription && <p className="sap-geo-lead">{fullCategoryDescription}</p>}

              <dl className="sap-geo-facts">
                <div>
                  <dt>Catalog Coverage</dt>
                  <dd>{data.total.toLocaleString('en-US')} indexed SKUs</dd>
                </div>
                <div>
                  <dt>Quality Standard</dt>
                  <dd>ISO9001 · 100% Helium Leak Tested</dd>
                </div>
                <div>
                  <dt>Standard MOQ</dt>
                  <dd>8 pcs per model (B2B wholesale)</dd>
                </div>
                <div>
                  <dt>Warranty Coverage</dt>
                  <dd>{warrantyText}</dd>
                </div>
                <div>
                  <dt>Dispatch &amp; Transit</dt>
                  <dd>{handlingText} handling · {transitText} ({carriersText})</dd>
                </div>
                <div>
                  <dt>Manufacturing Base</dt>
                  <dd>Zengcheng District, Guangzhou, China</dd>
                </div>
              </dl>

              {(facts.compressorSeries.length > 0 || facts.sampleOeNumbers.length > 0) && (
                <div className="sap-geo-tags-grid">
                  {facts.compressorSeries.length > 0 && (
                    <div className="sap-geo-tags-box">
                      <h3>Documented Compressor Platforms</h3>
                      <div className="sap-geo-chips">
                        {facts.compressorSeries.map((series) => (
                          <Link key={series} href={`${path}?q=${encodeURIComponent(series)}`}>
                            {series}
                          </Link>
                        ))}
                        {facts.voltages.map((v) => (
                          <span key={v}>{v}</span>
                        ))}
                        {facts.pulleyGrooves.map((g) => (
                          <span key={g}>{g}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {facts.sampleOeNumbers.length > 0 && (
                    <div className="sap-geo-tags-box">
                      <h3>Representative OE References</h3>
                      <div className="sap-geo-chips">
                        {facts.sampleOeNumbers.map((oe) => (
                          <Link key={oe} href={`/products?q=${encodeURIComponent(oe)}`}>
                            {oe}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {faqs.length > 0 && (
                <div className="sap-faq-block">
                  <h3>Frequently Asked Questions — {displayName}</h3>
                  <div className="sap-faq-list">
                    {faqs.map((item) => (
                      <details key={item.question}>
                        <summary>{item.question}</summary>
                        <p>{item.answer}</p>
                      </details>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </Shell>
  );
}
