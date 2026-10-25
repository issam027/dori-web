import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearSession } from '@/core/auth/session-actions';
import { useSessionStore } from '@/core/auth/session-store';
import { LocaleSwitcher } from '@/design-system/components/LocaleSwitcher';
import { useSite } from '@/features/portfolio/hooks/useSites';

export function PublicExperienceLayout({
  mode,
  children,
}: {
  mode: 'public' | 'device' | 'kiosk' | 'display' | 'tracking';
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const kioskSiteId =
    mode === 'kiosk' && user?.userType === 'kiosk' && !user.scope.isGlobal
      ? (user.scope.siteIds[0] ?? null)
      : null;
  const kioskSite = useSite(kioskSiteId);
  const logoutStarted = useRef(false);
  const disconnectRequested =
    (mode === 'kiosk' || mode === 'display' || mode === 'tracking') &&
    new URLSearchParams(location.search).get('deco')?.toLowerCase() === 'true';
  const origin = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (!disconnectRequested || logoutStarted.current) return;
    logoutStarted.current = true;
    void clearSession(queryClient).finally(() => {
      void navigate('/login', { replace: true });
    });
  }, [disconnectRequested, navigate, queryClient]);

  if (disconnectRequested) {
    return (
      <div className={`public-layout public-${mode}`}>
        <main className="experience-logout" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <strong>{t('shell.layouts.publicExperienceLayout.deconnexionDeLAppareil')}</strong>
        </main>
      </div>
    );
  }

  return (
    <div className={`public-layout public-${mode}`}>
      <header className={`public-header${mode === 'display' ? ' public-header-display' : ''}`}>
        <strong>{mode === 'kiosk' ? (kioskSite.data?.data.siteName ?? '') : t('app.name')}</strong>
        <LocaleSwitcher />
      </header>
      <main>{children}</main>
      {mode !== 'display' && mode !== 'kiosk' ? (
        <footer>
          <Link to="/legal" state={{ from: origin }}>
            {t('nav.legal')}
          </Link>
        </footer>
      ) : null}
    </div>
  );
}
