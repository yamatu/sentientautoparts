import Link from 'next/link';
export default function NotFound() { return <main className="mx-auto max-w-3xl px-6 py-24"><h1 className="text-3xl font-bold">404 — Page not found</h1><p className="mt-4">This page is unavailable or has been removed.</p><Link className="mt-6 inline-block text-blue-700 underline" href="/products">Browse products</Link></main>; }
