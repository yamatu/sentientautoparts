import { redirect } from 'next/navigation';
// Keep old bookmarks valid, but expose only one source of truth for profiles.
export default function Page(){redirect('/admin/social-media');}
