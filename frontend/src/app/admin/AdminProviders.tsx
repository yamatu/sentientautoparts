'use client';

import { AdminI18nProvider } from '@/lib/admin-i18n';
import { Toaster } from 'react-hot-toast';
import { ReactQueryProvider } from '@/lib/react-query';

export default function AdminProviders({ children }: { children: React.ReactNode }) {
  // Provide admin i18n context at the route layout level so pages can use `useAdminI18n()`.
  return (
    <ReactQueryProvider>
      <AdminI18nProvider>{children}</AdminI18nProvider>
      <Toaster position="top-right" />
    </ReactQueryProvider>
  );
}
