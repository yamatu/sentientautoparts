import HomePage, { homeMetadata } from '@/components/storefront/HomePage';

// ISR: served from the page cache and regenerated in the background. Backend
// saves revalidate "/" (all locale variants) and the homepage/settings tags.
export const revalidate = 300;

export function generateMetadata() { return homeMetadata(); }

export default function Home() { return <HomePage />; }
