import type { Metadata } from 'next';
import HomePage from '@/components/storefront/HomePage';

// Reached only through the middleware rewrite of `/?admin_preview=1` (the admin
// homepage editor iframe), so the public homepage itself can stay ISR-cached
// while the preview always reflects the latest saved content.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const metadata: Metadata = {
  title: 'Homepage preview',
  robots: { index: false, follow: false, nocache: true },
};

export default function HomepagePreview() { return <HomePage />; }
