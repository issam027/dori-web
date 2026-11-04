import { AnnouncementsProvider } from '@/shared/announcements/AnnouncementsProvider';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import { i18n } from '@/core/i18n/i18n';
import { AppErrorBoundary } from './AppErrorBoundary';
import { PreferenceSynchronizer } from './PreferenceSynchronizer';
import { createQueryClient } from './query-client';
import { restoreSession } from '@/core/auth/session-actions';
import { NotificationCenter } from '@/design-system/components/NotificationCenter';
import { onAuthenticationExpired } from '@/api/client/http-client';
import { expireSession } from '@/core/auth/session-actions';
import { startAccessTokenSync } from '@/core/auth/access-token';
import { SharedSiteSynchronizer } from '@/core/scope/SharedSiteSynchronizer';
import { SessionIdleWatchdog } from '@/core/auth/SessionIdleWatchdog';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const hydrationStarted = useRef(false);

  useEffect(
    () =>
      startAccessTokenSync(() => {
        void expireSession(queryClient, false);
      }),
    [queryClient],
  );

  useEffect(() => {
    if (hydrationStarted.current) return;
    hydrationStarted.current = true;
    if (window.location.pathname === '/track') return;
    void restoreSession().catch(() => {
      // An absent/expired refresh cookie is the normal anonymous startup path.
    });
  }, []);

  useEffect(
    () =>
      onAuthenticationExpired(() => {
        void expireSession(queryClient);
      }),
    [queryClient],
  );

  return (
    <AppErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <SharedSiteSynchronizer />
            <PreferenceSynchronizer />
            <SessionIdleWatchdog />
            <AnnouncementsProvider>{children}</AnnouncementsProvider>
            <NotificationCenter />
          </BrowserRouter>
        </QueryClientProvider>
      </I18nextProvider>
    </AppErrorBoundary>
  );
}
