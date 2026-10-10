import 'server-only';
import { permanentRedirect } from 'next/navigation';
import { storefront } from '@/services/storefront.server';

// Specific Next routes must consult aliases too; the root catch-all cannot
// intercept /news/:slug, /products/:sku or /categories/:path.
export async function redirectLegacyPath(path: string) {
  const route = await storefront<{ target: string }>(`resolve?path=${encodeURIComponent(path)}`);
  if (route?.target && route.target !== path && route.target.startsWith('/') && !route.target.startsWith('//') && !/[\\\r\n]/.test(route.target)) {
    permanentRedirect(route.target);
  }
}
