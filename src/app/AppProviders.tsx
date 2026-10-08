import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import { i18n } from '@/core/i18n/i18n';
import { AppErrorBoundary } from './AppErrorBoundary';
import { PreferenceSynchronizer } from './PreferenceSynchronizer';
import { createQueryClient } from './query-client';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <AppErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <PreferenceSynchronizer />
            {children}
          </BrowserRouter>
        </QueryClientProvider>
      </I18nextProvider>
    </AppErrorBoundary>
  );
}
