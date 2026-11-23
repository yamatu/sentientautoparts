'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import SafeImage from './SafeImage';

export interface SubcategoryPill {
  id: number;
  name: string;
  slug: string;
  image_url?: string;
  product_count: number;
}

const DEFAULT_VISIBLE = 8;

export default function CategorySubcategoriesBar({
  parentName,
  items,
}: {
  parentName: string;
  items: SubcategoryPill[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState('');

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const aOther = /other/i.test(a.name) ? 1 : 0;
      const bOther = /other/i.test(b.name) ? 1 : 0;
      if (aOther !== bOther) return aOther - bOther;
      return b.product_count - a.product_count || a.name.localeCompare(b.name);
    });
  }, [items]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) => c.name.toLowerCase().includes(q));
  }, [sorted, filter]);

  if (!sorted.length) return null;

  const hasMore = sorted.length > DEFAULT_VISIBLE;
  const visibleItems = expanded ? filtered : sorted.slice(0, DEFAULT_VISIBLE);

  return (
    <section className="sap-subcats-bar" aria-label={`Browse ${parentName} by vehicle make`}>
      <div className="sap-subcats-head">
        <div>
          <h2>Browse {parentName} by application</h2>
          <span>{sorted.length} vehicle makes &amp; series</span>
        </div>
        {hasMore && (
          <button
            type="button"
            className="sap-subcats-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                Show fewer <ChevronUp size={15} />
              </>
            ) : (
              <>
                Show all {sorted.length} makes <ChevronDown size={15} />
              </>
            )}
          </button>
        )}
      </div>

      {expanded && sorted.length > 12 && (
        <div className="sap-subcats-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter vehicle make (e.g. Toyota, BMW, Sanden)..."
            aria-label="Filter vehicle makes"
          />
        </div>
      )}

      <div className={expanded ? 'sap-subcats-grid is-expanded' : 'sap-subcats-grid'}>
        {visibleItems.map((cat) => (
          <Link key={cat.id} href={`/categories/${cat.slug}`} className="sap-subcat-card">
            {cat.image_url && (
              <span className="sap-subcat-thumb">
                <SafeImage src={cat.image_url} alt={`${cat.name} ${parentName}`} loading="lazy" />
              </span>
            )}
            <span className="sap-subcat-meta">
              <strong>{cat.name}</strong>
              <small>{cat.product_count.toLocaleString('en-US')} models</small>
            </span>
          </Link>
        ))}
        {!expanded && hasMore && (
          <button
            type="button"
            className="sap-subcat-card sap-subcat-more"
            onClick={() => setExpanded(true)}
          >
            <strong>+{sorted.length - DEFAULT_VISIBLE} more makes</strong>
            <small>Expand full list</small>
          </button>
        )}
      </div>
    </section>
  );
}
