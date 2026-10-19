import Shell from '@/components/storefront/Shell';
import SafeImage from '@/components/storefront/SafeImage';
import { storefront } from '@/services/storefront.server';
import { pageMetadata, plainText } from '@/lib/storefront-seo';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

// Reads searchParams (filters/pagination), so it stays request-rendered. Under
// the static [locale] layout, dropping this makes the page 500 at runtime with
// DYNAMIC_SERVER_USAGE. Its backend reads still use the Data Cache.
export const dynamic = 'force-dynamic';
export function generateMetadata() { return pageMetadata('/news', 'News & Insights'); }

interface Article {
  id: number;
  slug: string;
  title: string;
  summary: string;
  featured_image: string;
  updated_at: string;
}

interface ArticlesResponse {
  articles: Article[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

function ArticleCard({ a }: { a: Article }) {
  const summary = plainText(a.summary);
  const date = a.updated_at ? new Date(a.updated_at).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) : null;
  return (
    <article className="news-card">
      {a.featured_image && (
        <Link href={`/news/${a.slug}`} className="news-card-image" tabIndex={-1} aria-hidden="true">
          <SafeImage src={a.featured_image} alt={a.title} loading="lazy" />
        </Link>
      )}
      <div className="news-card-body">
        {date && <time className="news-card-date" dateTime={a.updated_at}>{date}</time>}
        <h2><Link href={`/news/${a.slug}`}>{a.title}</Link></h2>
        {summary && <p className="news-card-summary">{summary}</p>}
        <Link href={`/news/${a.slug}`} className="sap-text-link news-card-link">
          Read article <ArrowUpRight size={15} />
        </Link>
      </div>
    </article>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = params.page ? Math.max(1, parseInt(params.page)) : 1;
  const data = await storefront<ArticlesResponse>(`articles?page=${page}&page_size=12`);

  if (!data) {
    return (
      <Shell>
        <div className="sap-page-heading">
          <div className="sap-container">
            <nav className="sap-breadcrumb" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden="true">›</span>
              <span aria-current="page">News &amp; Insights</span>
            </nav>
            <h1>News &amp; Insights</h1>
          </div>
        </div>
        <div className="sap-container news-index-layout">
          <div className="sap-empty">
            <h2>Unable to load articles</h2>
            <p>Please try again later.</p>
          </div>
        </div>
      </Shell>
    );
  }

  const { articles, total_pages } = data;

  return (
    <Shell>
      <div className="sap-page-heading">
        <div className="sap-container">
          <nav className="sap-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">News &amp; Insights</span>
          </nav>
          <h1>News &amp; Insights</h1>
          <p>Industry updates, product launches, and technical resources.</p>
        </div>
      </div>
      <div className="sap-container news-index-layout">
        {articles?.length ? (
          <>
            <div className="news-grid">
              {articles.map(a => <ArticleCard key={a.id} a={a} />)}
            </div>
            {total_pages > 1 && (
              <div className="sap-pagination">
                {page > 1 && <Link href={`/news?page=${page - 1}`} aria-label="Previous page">← Previous</Link>}
                {Array.from({ length: Math.min(total_pages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (total_pages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= total_pages - 3) {
                    pageNum = total_pages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return pageNum === page ? (
                    <span key={pageNum} aria-current="page" className="sap-pagination-current">{pageNum}</span>
                  ) : (
                    <Link key={pageNum} href={`/news?page=${pageNum}`}>{pageNum}</Link>
                  );
                })}
                {page < total_pages && <Link href={`/news?page=${page + 1}`} aria-label="Next page">Next →</Link>}
              </div>
            )}
          </>
        ) : (
          <div className="sap-empty">
            <h2>No articles published yet</h2>
            <p>Check back soon for industry updates and resources.</p>
          </div>
        )}
      </div>
    </Shell>
  );
}
